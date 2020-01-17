import { forEach } from '@toba/node-tools';
import {
   OverpassResponse,
   OverpassWay,
   ItemType,
   OverpassNode
} from '@toba/osm-models';
import { VectorTile, Point, VectorFeature, Type } from './types';

/**
 * Translate latitude from WSG84 to percent.
 */
const projectX = (x: number): number => x / 360 + 0.5;

/**
 * Translate longitude from WSG84 to percent.
 */
function projectY(y: number): number {
   const sin = Math.sin((y * Math.PI) / 180);
   const y2 = 0.5 - (0.25 * Math.log((1 + sin) / (1 - sin))) / Math.PI;
   return y2 < 0 ? 0 : y2 > 1 ? 1 : y2;
}

export function prepare(res: OverpassResponse): VectorTile {
   const nodes = new Map<number, Point>();
   const ways: OverpassWay[] = [];

   forEach(res.elements, el => {
      switch (el.type) {
         case ItemType.Node: {
            const n = el as OverpassNode;
            nodes.set(n.id, [projectX(n.lat), projectY(n.lon)]);
            break;
         }
         case ItemType.Way:
            ways.push(el as OverpassWay);
            break;
         default:
            break;
      }
   });

   return {
      layers: {
         overpass: {
            features: ways.map(
               w =>
                  ({
                     type: Type.Line,
                     properties: {},
                     geometry: [
                        w.nodes
                           .filter(id => nodes.has(id))
                           .map(id => nodes.get(id)!)
                     ]
                  } as VectorFeature)
            )
         }
      }
   } as VectorTile;
}
