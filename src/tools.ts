import { forEach } from '@toba/tools';
import {
   VectorTile,
   VectorFeature,
   LayerMap,
   TileStatus,
   Geometry,
   PointList,
   FeatureStatus
} from './types';

/**
 * Execute method for each feature in a tile, across all layers.
 */
export function eachFeature(
   tile: VectorTile,
   fn: (f: VectorFeature, layeName: string) => void
) {
   Object.keys(tile.layers).forEach(name => {
      forEach(tile.layers[name].features, f => fn(f, name));
   });
}

export function eachPoint(
   line: PointList,
   fn: (x: number, y: number, zoom: number) => void
) {
   for (let i = 0; i < line.length; i += 3) {
      fn(line[i], line[i + 1], line[i + 2]);
   }
}

/**
 * Create a unique ID based on tile coordinate.
 */
export const tileID = (z: number, x: number, y: number) =>
   ((1 << z) * y + x) * 32 + z;

export const emptyTileStatus = (x = 0, y = 0, z = 0): TileStatus => ({
   pointCount: 0,
   simplifiedCount: 0,
   featureCount: 0,
   x,
   y,
   z,
   complete: false,
   minX: 2,
   minY: 1,
   maxX: -1,
   maxY: 0
});

export const emptyFeatureStatus = (geometry: Geometry): FeatureStatus => ({
   pointCount: 0,
   simplifiedCount: 0,
   featureCount: 0,
   minX: 2,
   minY: 1,
   maxX: -1,
   maxY: 0,
   geometry
});

export function copyGeometry(g: Geometry): Geometry {
   const out: Geometry = [];
   forEach(g, line => out.push(line.slice()));
   return out;
}

export const copyFeature = (f: VectorFeature): VectorFeature => ({
   id: f.id,
   type: f.type,
   geometry: copyGeometry(f.geometry),
   properties: f.properties,
   status: emptyFeatureStatus(f.geometry)
});

export function copyLayers(layers: LayerMap): LayerMap {
   const out: LayerMap = {};
   Object.keys(layers).forEach(name => {
      const l = layers[name];
      out[name] = {
         version: l.version,
         name,
         extent: l.extent,
         features: l.features.map(copyFeature)
      };
   });
   return out;
}

export const copyTile = (tile: VectorTile): VectorTile => ({
   layers: copyLayers(tile.layers),
   // TODO: copy status
   status: emptyTileStatus()
});
