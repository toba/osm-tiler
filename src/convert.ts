import { forEach } from '@toba/tools';
import { Point, PointList } from './types';

export interface ConversionOptions {
   /** Maximum zoom (`0-24`) to preserve detail on */
   maxZoom: number;
   /** Simplification tolerance (higher means simpler) */
   tolerance: number;
   /** Tile extent */
   extent: number;
   /** Tile buffer on each side */
   buffer: number;
   /** Name of a feature property to be promoted to `feature.id` */
   promoteID?: string;
   /** Whether to generate feature IDs. Cannot be used with `promoteID`. */
   generateID: boolean;
   /** Whether to calculate line metrics */
   lineMetrics: boolean;
   /** Maximum zoom in the tile index */
   indexMaxZoom: number;
   /** Maximum number of points per tile in the tile index */
   indexMaxPoints: number;
}

/**
 * Create a unique ID based on tile coordinate.
 */
const tileID = (z: number, x: number, y: number) => ((1 << z) * y + x) * 32 + z;

function convertPoint(coords: Point, out: PointList) {
   out.push(projectX(coords[0]), projectY(coords[1]), 0);
}

/**
 * @param tolerance Simplification tolerance based on zoom level and extent
 * @param isPolygon Whether line is closed (start and end connect)
 */
function convertLine(
   line: Position[],
   out: PointList,
   tolerance: number,
   isPolygon: boolean
) {
   /** Last `x` coordinate */
   let x0 = 0;
   /** Last `y` coordinate */
   let y0 = 0;
   /** Length of line or area of polygon */
   let size = 0;

   forEach(line, (point, i) => {
      const x = projectX(point[0]);
      const y = projectY(point[1]);

      out.push(x, y, 0);

      if (i > 0) {
         size += isPolygon
            ? // area
              (x0 * y - x * y0) / 2
            : // length
              Math.sqrt((x - x0) ** 2 + (y - y0) ** 2);
      }
      x0 = x;
      y0 = y;
   });

   const last = out.length - 3;
   out[2] = 1;
   simplify(out, 0, last, tolerance);
   out[last + 2] = 1;

   out.size = Math.abs(size);
   out.start = 0;
   out.end = out.size;
}
