import { forEach } from '@toba/node-tools'
import { Axis, PointList, VectorTile, Type, Geometry } from './types'
import { eachFeature, copyTile } from './tools'

/**
 * Add point with zoom setting to `out` list.
 * @param z Zoom
 */
function addPoint(out: PointList, x: number, y: number, z: number) {
   out.push(x, y, z)
}

/**
 * Add point within segmment at boundary along X axis.
 */
function intersectX(
   out: PointList,
   ax: number,
   ay: number,
   bx: number,
   by: number,
   edgeX: number
): number {
   const t = (edgeX - ax) / (bx - ax)
   addPoint(out, edgeX, ay + (by - ay) * t, 1)
   return t
}

/**
 * Add point within segment at boundary along Y axis.
 */
function intersectY(
   out: PointList,
   ax: number,
   ay: number,
   bx: number,
   by: number,
   edgeY: number
): number {
   const t = (edgeY - ay) / (by - ay)
   addPoint(out, ax + (bx - ax) * t, edgeY, 1)
   return t
}

function newSegment(line: PointList): PointList {
   const l: PointList = []
   l.size = line.size
   return l
}

/**
 * Add `points` to `out` that fall within the `k1` to `k2` range.
 */
function clipPoints(
   points: PointList,
   out: PointList,
   k1: number,
   k2: number,
   axis: Axis
) {
   for (let i = 0; i < points.length; i += 3) {
      const a = points[i + axis]

      if (a >= k1 && a <= k2) {
         addPoint(out, points[i], points[i + 1], points[i + 2])
      }
   }
}

/**
 * @param out Array of lines since original `line` may be sliced to fit
 * boundaries
 * @param k1 Lower axis boundary
 * @param k2 Upper axis boundary
 */
function clipLine(
   line: PointList,
   out: Geometry,
   k1: number,
   k2: number,
   axis: Axis,
   isPolygon: boolean
) {
   let segment = newSegment(line)
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
         if (b > k1) intersect(segment, ax, ay, bx, by, k1)
      } else if (a > k2) {
         // |  <--|—— (line enters the clip region from the right)
         if (b < k2) intersect(segment, ax, ay, bx, by, k2)
      } else {
         addPoint(segment, ax, ay, az)
      }

      if (b < k1 && a >= k1) {
         // <--|——  | or <--|———|—— (line exits the clip region on the left)
         intersect(segment, ax, ay, bx, by, k1)
         exited = true
      }
      if (b > k2 && a <= k2) {
         // |  ——|--> or ——|———|--> (line exits the clip region on the right)
         intersect(segment, ax, ay, bx, by, k2)
         exited = true
      }

      if (!isPolygon && exited) {
         out.push(segment)
         segment = newSegment(line)
      }
   }

   // add the last point
   let last = line.length - 3
   const ax = line[last]
   const ay = line[last + 1]
   const az = line[last + 2]
   const a = axis === Axis.Horizontal ? ax : ay

   if (a >= k1 && a <= k2) addPoint(segment, ax, ay, az)

   // close the polygon if its endpoints are not the same after clipping
   last = segment.length - 3

   if (
      isPolygon &&
      last >= 3 &&
      (segment[last] !== segment[0] || segment[last + 1] !== segment[1])
   ) {
      addPoint(segment, segment[0], segment[1], segment[2])
   }

   // add the final segment
   if (segment.length > 0) out.push(segment)
}

/**
 * @param isPolygon Whether lines should form a polygon, meaning start and end
 * points are equal
 */
function clipPolygon(
   lines: PointList[],
   out: PointList[],
   k1: number,
   k2: number,
   axis: Axis,
   isPolygon = true
) {
   forEach(lines, line => clipLine(line, out, k1, k2, axis, isPolygon))
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
   zoom: number,
   k1: number,
   k2: number,
   axis: Axis,
   minAll: number,
   maxAll: number
): VectorTile | null {
   k1 /= zoom
   k2 /= zoom

   // all features within bounds — trivial accept
   if (minAll >= k1 && maxAll < k2) return tile
   // all features outside bounds — trivial reject
   if (maxAll < k1 || minAll >= k2) return null

   /** Whether points exist within clipped region */
   let hasPoints = false
   const copy = copyTile(tile, true)

   eachFeature(copy, f => {
      const min = axis === Axis.Horizontal ? f.metrics.minX : f.metrics.minY
      const max = axis === Axis.Horizontal ? f.metrics.maxX : f.metrics.maxY

      if (min >= k1 && max < k2) {
         // trivial accept
         hasPoints = true
         return
      }
      if (max < k1 || min >= k2) {
         // trivial reject
         return
      }

      /** Original geometry */
      const from = f.geometry
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
            clipPolygon(from, clipped, k1, k2, axis)
            break
         default:
            break
      }

      if (clipped.length > 0 && clipped[0].length > 0) hasPoints = true

      f.geometry = clipped
   })

   return hasPoints ? copy : null
}
