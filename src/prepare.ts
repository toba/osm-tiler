import { forEach } from '@toba/node-tools';
import {
   OverpassResponse,
   OverpassWay,
   ItemType,
   OverpassNode,
   OverpassElement
} from '@toba/osm-models';
import {
   VectorTile,
   Point,
   VectorFeature,
   Type,
   Options,
   Geometry
} from './types';
import { Schema } from './schema';
import { emptyStatus } from './tools';

/**
 * Translate latitude from WSG84 to unit square.
 */
const projectX = (x: number): number => x / 360 + 0.5;

/**
 * Translate longitude from WSG84 to unit square.
 */
function projectY(y: number): number {
   const sin = Math.sin((y * Math.PI) / 180);
   const y2 = 0.5 - (0.25 * Math.log((1 + sin) / (1 - sin))) / Math.PI;
   return y2 < 0 ? 0 : y2 > 1 ? 1 : y2;
}

/**
 * Divide elements into layers according to the OpenMapTiles Vector Tile Schema.
 * @see https://openmaptiles.org/schema/
 */
export function inferLayer(el: OverpassElement): Schema {
   // TODO: map elements to layer names
   return Schema.Transportation;
}

/**
 * Create initial `VectorTile` from Overpass response. This initial "tile"
 * exists only temporarily to hold data in the expected format. It must be
 * split into proper tiles before serving to a map.
 */
export function prepare(res: OverpassResponse, options: Options): VectorTile {
   /** Nodes keyed to their OSM ID */
   const nodes = new Map<number, Point>();
   /** Ways keyed to a layer name */
   const layers = new Map<string, OverpassWay[]>();

   let pointCount = 0;
   let featureCount = 0;

   forEach(res.elements, el => {
      switch (el.type) {
         case ItemType.Node: {
            const n = el as OverpassNode;
            nodes.set(n.id, [projectX(n.lat), projectY(n.lon)]);
            pointCount++;
            break;
         }
         case ItemType.Way: {
            const layerName = inferLayer(el);
            if (!layers.has(layerName)) {
               layers.set(layerName, []);
            }
            layers.get(layerName)!.push(el as OverpassWay);
            featureCount++;
            break;
         }
         case ItemType.Relation:
            // TODO: handle relations
            break;
         default:
            break;
      }
   });

   const tile: VectorTile = {
      layers: {},
      status: {
         ...emptyStatus(),
         pointCount,
         featureCount
      }
   };

   layers.forEach((ways, name) => {
      tile.layers[name] = {
         features: ways.map(w => {
            const geometry: Geometry = [[]];

            forEach(w.nodes, id => {
               if (nodes.has(id)) {
                  const n = nodes.get(id)!;
                  geometry[0].push(n[0], n[1], 0);
               }
            });

            return {
               type: Type.Line,
               properties: {},
               geometry
            } as VectorFeature;
         })
      };
   });

   return tile;
}
