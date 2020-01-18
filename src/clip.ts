import { forEach } from '@toba/node-tools'
import { Axis, PointList, VectorTile, Type, Geometry } from './types'
import { eachFeature, copyTile } from './tools'

/**
 * @param z Zoom
 */
function addPoint(out: PointList, x: number, y: number, z: number) {
   out.push(x, y, z)
}

function intersectX(
   out: number[],
   ax: number,
   ay: number,
   bx: number,
   by: number,
   x: number
): number {
   const t = (x - ax) / (bx - ax)
   addPoint(out, x, ay + (by - ay) * t, 1)
   return t
}

function intersectY(
   out: number[],
   ax: number,
   ay: number,
   bx: number,
   by: number,
   y: number
): number {
   const t = (y - ay) / (by - ay)
   addPoint(out, ax + (bx - ax) * t, y, 1)
   return t
}

function newSlice(line: PointList) {
   const slice: PointList = []
   slice.size = line.size
   slice.start = line.start
   slice.end = line.end
   return slice
}

function clipPoints(
   points: PointList,
   newPoints: PointList,
   k1: number,
   k2: number,
   axis: Axis
) {
   for (let i = 0; i < points.length; i += 3) {
      const a = points[i + axis]

      if (a >= k1 && a <= k2) {
         addPoint(newPoints, points[i], points[i + 1], points[i + 2])
      }
   }
}

/**
 * @param newLine Array of lines since original `line` may be sliced to fit
 * boundaries
 * @param k1 Lower axis boundary
 * @param k2 Upper axis boundary
 */
function clipLine(
   line: PointList,
   newLine: Geometry,
   k1: number,
   k2: number,
   axis: Axis,
   isPolygon: boolean
) {
   let slice = newSlice(line)
   const intersect = axis === Axis.Horizontal ? intersectX : intersectY

   for (let i = 0; i < line.length - 3; i += 3) {
      const ax = line[i]
      const ay = line[i + 1]
      const az = line[i + 2]
      const bx = line[i + 3]
      const by = line[i + 4]
      /** Axis coordinate for point `a` */
      const a = axis === Axis.Horizontal ? ax : ay
      /** Axis coordinate for point `b` */
      const b = axis === Axis.Horizontal ? bx : by
      /** Whether line exits the clip area */
      let exited = false

      if (a < k1) {
         // ——|-->  | (line enters the clip region from the left)
         if (b > k1) intersect(slice, ax, ay, bx, by, k1)
      } else if (a > k2) {
         // |  <--|—— (line enters the clip region from the right)
         if (b < k2) intersect(slice, ax, ay, bx, by, k2)
      } else {
         addPoint(slice, ax, ay, az)
      }
      if (b < k1 && a >= k1) {
         // <--|——  | or <--|———|—— (line exits the clip region on the left)
         intersect(slice, ax, ay, bx, by, k1)
         exited = true
      }
      if (b > k2 && a <= k2) {
         // |  ——|--> or ——|———|--> (line exits the clip region on the right)
         intersect(slice, ax, ay, bx, by, k2)
         exited = true
      }

      if (!isPolygon && exited) {
         newLine.push(slice)
         slice = newSlice(line)
      }
   }

   // add the last point
   let last = line.length - 3
   const ax = line[last]
   const ay = line[last + 1]
   const az = line[last + 2]
   const a = axis === 0 ? ax : ay

   if (a >= k1 && a <= k2) addPoint(slice, ax, ay, az)

   // close the polygon if its endpoints are not the same after clipping
   last = slice.length - 3

   if (
      isPolygon &&
      last >= 3 &&
      (slice[last] !== slice[0] || slice[last + 1] !== slice[1])
   ) {
      addPoint(slice, slice[0], slice[1], slice[2])
   }

   // add the final slice
   if (slice.length > 0) newLine.push(slice)
}

/**
 * @param isPolygon Whether lines should form a polygon, meaning start and end
 * points are equal
 */
function clipLines(
   lines: PointList[],
   newLines: PointList[],
   k1: number,
   k2: number,
   axis: Axis,
   isPolygon: boolean
) {
   forEach(lines, line => clipLine(line, newLines, k1, k2, axis, isPolygon))
}

/**
 * Stripe clipping algorithm. Clip features between two vertical or horizontal
 * axis-parallel lines:
 *     |        |
 *  ___|___     |     /
 * /   |   \____|____/
 *     |        |
 *
 * @param k1 Lower axis boundary
 * @param k2 Upper axis boundary
 */
export function clip(
   tile: VectorTile,
   scale: number,
   k1: number,
   k2: number,
   axis: Axis,
   minAll: number,
   maxAll: number
): VectorTile | null {
   k1 /= scale
   k2 /= scale

   // all features within bounds — trivial accept
   if (minAll >= k1 && maxAll < k2) return tile
   // all features outside bounds — trivial reject
   if (maxAll < k1 || minAll >= k2) return null

   /** Whether clipped region still has points */
   let hasPoints = false
   const copy = copyTile(tile)

   eachFeature(copy, f => {
      /** Original geometry */
      const from = f.geometry
      const min = axis === Axis.Horizontal ? f.status.minX : f.status.minY
      const max = axis === Axis.Horizontal ? f.status.maxX : f.status.maxY

      if (min >= k1 && max < k2) {
         // trivial accept
         hasPoints = true
         return
      }
      if (max < k1 || min >= k2) {
         // trivial reject
         return
      }

      const clipped: Geometry = []

      switch (f.type) {
         case Type.Point:
            clipped.push([])
            clipPoints(from[0], clipped[0], k1, k2, axis)
            break
         case Type.Line:
            clipLine(from[0], clipped, k1, k2, axis, false)
            break
         case Type.Polygon:
            clipLines(from, clipped, k1, k2, axis, true)
            break
         default:
            break
      }

      if (clipped.length > 0 && clipped[0].length > 0) hasPoints = true

      f.geometry = clipped
   })

   return hasPoints ? copy : null
}
