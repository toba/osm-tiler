import { forEach } from '@toba/tools';
import { Point, PointList } from './types';

/**
 * Create a unique ID based on tile coordinate.
 */
const tileID = (z: number, x: number, y: number) => ((1 << z) * y + x) * 32 + z;

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
      const x = point[0];
      const y = point[1];

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
