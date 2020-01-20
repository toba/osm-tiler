import { forEach } from '@toba/tools'
import {
   VectorTile,
   Options,
   Axis,
   PointList,
   VectorFeature,
   Type
} from './types'
import {
   eachFeature,
   tileID,
   eachPoint,
   copyFeature,
   copyLayers,
   emptyTileMetrics
} from './tools'
import { clip } from './clip'

const tileCache = new Map<number, VectorTile>()

function rewind(line: PointList, clockwise: boolean) {
   let area = 0

   for (let i = 0, len = line.length, j = len - 2; i < len; j = i, i += 2) {
      area += (line[i] - line[j]) * (line[i + 1] + line[j + 1])
   }

   if (area > 0 === clockwise) {
      for (let i = 0, len = line.length; i < len / 2; i += 2) {
         const x = line[i]
         const y = line[i + 1]

         line[i] = line[len - 2 - i]
         line[i + 1] = line[len - 1 - i]
         line[len - 2 - i] = x
         line[len - 1 - i] = y
      }
   }
}

function addLine(
   out: PointList[],
   from: PointList,
   tile: VectorTile,
   tolerance: number,
   isPolygon: boolean,
   isOuter: boolean
): void {
   const sqTolerance = tolerance * tolerance

   if (
      tolerance > 0 &&
      (from.size ?? 0) < (isPolygon ? sqTolerance : tolerance)
   ) {
      tile.metrics.pointCount += from.length / 3
      return
   }

   const points: PointList = []

   eachPoint(from, (x, y, z) => {
      if (tolerance === 0 || z > sqTolerance) {
         tile.metrics.simplifiedCount++
         points.push(x, y)
      }
      tile.metrics.pointCount++
   })

   if (isPolygon) rewind(points, isOuter)

   out.push(points)
}

function addFeature(
   tile: VectorTile,
   feature: VectorFeature,
   layerName: string,
   tolerance: number
) {
   const { type, geometry } = feature
   /** `x` and `y` without `z` */
   const simplified: PointList[] = []

   switch (type) {
      case Type.Point:
         simplified.push([])
         eachPoint(geometry[0], (x, y) => {
            simplified[0].push(x, y)
            tile.metrics.pointCount++
            tile.metrics.simplifiedCount++
         })
         break
      case Type.Line:
         addLine(simplified, geometry[0], tile, tolerance, false, false)
         break
      case Type.Polygon:
         forEach(geometry, (line, i) =>
            addLine(
               simplified,
               line,
               tile,
               tolerance,
               type === Type.Polygon,
               i === 0
            )
         )
         break

      default:
         break
   }

   if (simplified.length > 0 && simplified[0].length > 0) {
      const f = copyFeature(feature, false)
      f.geometry = simplified
      tile.layers[layerName].features.push(f)
   }
}

/**
 * Create sub-tile at new zoom level and position and simplify its coordinates
 * to match.
 */
export function createTile(
   source: VectorTile,
   z: number,
   x: number,
   y: number,
   options: Options
): VectorTile {
   const tolerance =
      z === options.maxZoom
         ? 0
         : options.tolerance / ((1 << z) * options.extent)

   const tile: VectorTile = {
      layers: copyLayers(source.layers),
      metrics: emptyTileMetrics(x, y, z)
   }
   const metrics = tile.metrics

   eachFeature(tile, (f, layerName) => {
      addFeature(tile, f, layerName, tolerance)

      const { minX, minY, maxX, maxY } = f.metrics

      if (minX < metrics.minX) metrics.minX = minX
      if (minY < metrics.minY) metrics.minY = minY
      if (maxX > metrics.maxX) metrics.maxX = maxX
      if (maxY > metrics.maxY) metrics.maxY = maxY
   })

   return tile
}

type StackItem = [VectorTile, number, number, number]

/**
 * Split tile into quadtiles, recursively. Splitting stops when maximum zoom is
 * reached or when the number of points is low as specified in the options.
 *
 * Splitting is accomplished by duplicating the parent tile then clipping its
 * features to fit each of the child bounds.
 *
 * @param z Zoom
 */
export function splitTile(
   parent: VectorTile,
   options: Options,
   z = 0,
   x = 0,
   y = 0
) {
   const stack: StackItem[] = [[parent, z, x, y]]
   let next: VectorTile | null

   while (stack.length > 0) {
      ;[next, z, x, y] = stack.pop()!

      /** Next zoom level */
      const z2 = 1 << z
      const id = tileID(z, x, y)
      let tile = tileCache.get(id)

      if (tile === undefined) {
         tile = createTile(next, z, x, y, options)
         tileCache.set(id, tile)
      }

      if (
         z == options.maxTileZoom ||
         tile.metrics.pointCount <= options.maxTilePoints ||
         z == options.maxZoom
      ) {
         // stop splitting if max zoom is reached or tile is too simple to
         // warrant further splitting
         continue
      }

      if (next.metrics.featureCount === 0) continue

      // values used for clipping
      const k1 = (0.5 * options.buffer) / options.extent
      const k2 = 0.5 - k1
      const k3 = 0.5 + k1
      const k4 = 1 + k1
      const { minX, minY, maxX, maxY } = tile.metrics

      /** Top left */
      let tl: VectorTile | null = null
      /** Bottom left */
      let bl: VectorTile | null = null
      /** Top right */
      let tr: VectorTile | null = null
      /** Bottom right */
      let br: VectorTile | null = null

      let left = clip(next, z2, x - k1, x + k3, Axis.Horizontal, minX, maxX)
      let right = clip(next, z2, x + k2, x + k4, Axis.Horizontal, minX, maxX)

      next = null

      if (left !== null) {
         tl = clip(left, z2, y - k1, y + k3, Axis.Vertical, minY, maxY)
         bl = clip(left, z2, y + k2, y + k4, Axis.Vertical, minY, maxY)
         left = null
      }

      if (right !== null) {
         tr = clip(right, z2, y - k1, y + k3, Axis.Vertical, minY, maxY)
         br = clip(right, z2, y + k2, y + k4, Axis.Vertical, minY, maxY)
         right = null
      }

      if (tl !== null) stack.push([tl, z + 1, x * 2, y * 2])
      if (bl !== null) stack.push([bl, z + 1, x * 2, y * 2 + 1])
      if (tr !== null) stack.push([tr, z + 1, x * 2 + 1, y * 2])
      if (br !== null) stack.push([br, z + 1, x * 2 + 1, y * 2 + 1])

      // TODO: mb source saves tile ID even when it has no features
   }

   return tileCache.values()
}
