import { forEach } from '@toba/tools'
import { PointList, VectorTile, Options, Type } from './types'
import { eachFeature } from './tools'

/**
 * @param tolerance Simplification tolerance based on zoom level and extent
 * @param isPolygon Whether line is closed (start and end connect)
 */
function convertLine(line: PointList, tolerance: number, isPolygon: boolean) {
   const out: PointList = []
   /** Last `x` coordinate */
   let x0 = 0
   /** Last `y` coordinate */
   let y0 = 0
   /** Length of line or area of polygon */
   let size = 0

   forEach(line, (point, i) => {
      const x = point[0]
      const y = point[1]

      out.push(x, y, 0)

      if (i > 0) {
         size += isPolygon
            ? // area
              (x0 * y - x * y0) / 2
            : // length
              Math.sqrt((x - x0) ** 2 + (y - y0) ** 2)
      }
      x0 = x
      y0 = y
   })

   const last = out.length - 3
   out[2] = 1
   simplify(out, 0, last, tolerance)
   out[last + 2] = 1

   out.size = Math.abs(size)
   //out.start = 0
   //out.end = out.size

   return out
}

export function convert(tile: VectorTile, options: Options): VectorTile {
   const tolerance =
      (options.tolerance / ((1 << options.maxZoom) * options.extent)) ** 2

   eachFeature(tile, f => {
      if (f.type == Type.Line || f.type == Type.Polygon) {
         forEach(f.geometry, (line, i) => {
            if (line.length > 3) {
               f.geometry[i] = convertLine(
                  line,
                  tolerance,
                  f.type == Type.Polygon
               )
            }
         })
      }
   })

   return tile
}
