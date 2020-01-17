import { forEach } from '@toba/tools';
import { VectorTile, VectorLayer, VectorFeature } from './types';

const tileCache = new Map<number, VectorTile>();
const usedCoord = new Set<{ z: number; x: number; y: number }>();

/**
 * Create a unique ID based on tile coordinate.
 */
const tileID = (z: number, x: number, y: number) => ((1 << z) * y + x) * 32 + z;

function addLine(to: VectorTile) {
    
}

function addFeature(to: VectorTile, feature: VectorFeature, layerName: string) {
   const target = to.layers[layerName];
   target.features.push(feature);
}

function addLayer(to: VectorTile, layer: VectorLayer, name: string) {
   to.layers[name] = {
      name: layer.name,
      version: layer.version,
      extent: layer.extent,
      features: []
   };
   forEach(layer.features, f => addFeature(to, f, name));
}

/**
 * Simplified tile generation.
 */
export function createTile(
   parent: VectorTile,
   z: number,
   x: number,
   y: number,
   options: Options
): VectorTile {
   const tolerance =
      z === options.maxZoom
         ? 0
         : options.tolerance / ((1 << z) * options.extent);

   const tile: VectorTile = {
      layers: {},
      pointCount: 0,
      simplifiedCount: 0,
      featureCount: 0,
      x,
      y,
      z,
      transformed: false,
      minX: 2,
      minY: 1,
      maxX: -1,
      maxY: 0
   };

   Object.keys(parent.layers).forEach(name =>
      addLayer(tile, parent.layers[name], name)
   );

   //    forEach(features, f => {
   //       addFeature(tile, f, tolerance, options);

   //       const { minX, minY, maxX, maxY } = f;

   //       if (minX < tile.minX) {
   //          tile.minX = minX;
   //       }
   //       if (minY < tile.minY) {
   //          tile.minY = minY;
   //       }
   //       if (maxX > tile.maxX) {
   //          tile.maxX = maxX;
   //       }
   //       if (maxY > tile.maxY) {
   //          tile.maxY = maxY;
   //       }
   //    });

   return tile;
}

/**
 * Splits features from a parent tile to sub-tiles.
 * `z`, `x`, and `y` are the coordinates of the parent tile;
 *
 * If no target tile is specified, splitting stops when we reach the maximum
 * zoom or the number of points is low as specified in the options.
 *
 * @param cz Target tile `z` coordinate
 * @param cx Target tile `x` coordinate
 * @param cy Target tile `y` coordinate
 */
export function splitTile(
   tile: VectorTile,
   z: number,
   x: number,
   y: number,
   cz?: number,
   cx?: number,
   cy?: number
) {
   const stack = [tile, z, x, y];
   let next: VectorTile;

   // avoid recursion by using a processing queue
   while (stack.length > 0) {
      y = stack.pop() as number;
      x = stack.pop() as number;
      z = stack.pop() as number;
      next = stack.pop() as VectorTile;

      const z2 = 1 << z;
      const id = tileID(z, x, y);
      let tile = tileCache.get(id);

      if (tile === undefined) {
         tile = createTile(features, z, x, y, options);
         tileCache.set(id, tile);
         usedCoord.add({ z, x, y });
      }

      // if it's the first-pass tiling
      if (cz === undefined) {
         // stop tiling if we reached max zoom, or if the tile is too simple
         if (
            z === options.indexMaxZoom ||
            tile.numPoints <= options.indexMaxPoints
         ) {
            continue;
         }
         // if a drilldown to a specific tile
      } else if (z === options.maxZoom || z === cz) {
         // stop tiling if we reached base zoom or our target tile zoom
         continue;
      } else if (cz !== undefined && cx !== undefined && cy !== undefined) {
         // stop tiling if it's not an ancestor of the target tile
         const zoomSteps = cz - z;
         if (x !== cx >> zoomSteps || y !== cy >> zoomSteps) {
            continue;
         }
      }

      // if we slice further down, no need to keep source geometry
      tile.source = undefined;

      if (features.length === 0) {
         continue;
      }

      if (debug > LogLevel.Basic) {
         console.time('clipping');
      }

      // values we'll use for clipping
      const k1 = (0.5 * options.buffer) / options.extent;
      const k2 = 0.5 - k1;
      const k3 = 0.5 + k1;
      const k4 = 1 + k1;

      /** Top left */
      let tl = null;
      /** Bottom left */
      let bl = null;
      /** Top right */
      let tr = null;
      /** Bottom right */
      let br = null;
      // prettier-ignore
      let left = clip(features, z2, x - k1, x + k3, 0, tile.minX, tile.maxX,
          options
       );
      // prettier-ignore
      let right = clip(features, z2, x + k2, x + k4, 0, tile.minX, tile.maxX,
          options
       );
      features = null;

      if (left !== null) {
         // prettier-ignore
         tl = clip(left, z2, y - k1, y + k3, 1, tile.minY, tile.maxY,
             options
          );
         // prettier-ignore
         bl = clip(left, z2, y + k2, y + k4, 1, tile.minY, tile.maxY,
             options
          );
         left = null;
      }

      if (right !== null) {
         // prettier-ignore
         tr = clip(right, z2, y - k1, y + k3, 1, tile.minY, tile.maxY,
             options
          );
         // prettier-ignore
         br = clip(right, z2, y + k2, y + k4, 1, tile.minY, tile.maxY,
             options
          );
         right = null;
      }

      if (debug > LogLevel.Basic) {
         console.timeEnd('clipping');
      }

      stack.push(tl ?? [], z + 1, x * 2, y * 2);
      stack.push(bl ?? [], z + 1, x * 2, y * 2 + 1);
      stack.push(tr ?? [], z + 1, x * 2 + 1, y * 2);
      stack.push(br ?? [], z + 1, x * 2 + 1, y * 2 + 1);
   }
}
