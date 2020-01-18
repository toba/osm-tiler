import { forEach } from '@toba/tools'
import {
   VectorTile,
   Options,
   Axis,
   PointList,
   Geometry,
   VectorFeature,
   Type
} from './types'
import { eachFeature, copyTile, tileID, eachPoint } from './tools'
import { clip } from './clip'

const tileCache = new Map<number, VectorTile>()
//const usedCoord = new Set<{ z: number; x: number; y: number }>();

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
   out: number[][],
   line: PointList,
   tile: VectorTile,
   tolerance: number,
   isPolygon: boolean,
   isOuter: boolean
): void {
   const sqTolerance = tolerance * tolerance

   if (
      tolerance > 0 &&
      (line.size ?? 0) < (isPolygon ? sqTolerance : tolerance)
   ) {
      tile.status.pointCount += line.length / 3
      return
   }

   const points: PointList = []
   points.dimensions = 2

   eachPoint(line, (x, y, z) => {
      if (tolerance === 0 || z > sqTolerance) {
         tile.status.simplifiedCount++
         points.push(x, y)
      }
      tile.status.pointCount++
   })

   if (isPolygon) rewind(line, isOuter)

   out.push(points)
}

function addFeature(
   tile: VectorTile,
   feature: VectorFeature,
   tolerance: number,
   options: Options
) {
   const { type, geometry } = feature
   const simplified: PointList = []

   switch (type) {
      case Type.Point:
         eachPoint(geometry as MemLine, (x, y) => {
            ;(simplified as number[]).push(x, y)
            tile.numPoints++
            tile.numSimplified++
         })
         break
      case Type.Line:
         addLine(
            simplified as TileLine,
            geom as MemLine,
            tile,
            tolerance,
            false,
            false
         )
         break
      case Type.Polygon:
         forEach(geom as MemPolygon, (line, i) =>
            addLine(
               simplified as TileLine,
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

   if (simplified.length > 0) {
      let tags = feature.tags

      if (type === Type.Line && options.lineMetrics) {
         const line = geom as MemLine
         const size = line.size!
         tags = {}

         if (feature.tags !== null) {
            Object.keys(feature.tags).forEach((key: string) => {
               tags![key] = feature.tags![key]
            })
         }
         tags['mapbox_clip_start'] = line.start! / size
         tags['mapbox_clip_end'] = line.end! / size
      }

      const tileFeature: TileFeature = {
         geometry: simplified,
         type:
            type === Type.Polygon || type === Type.MultiPolygon
               ? TileFeatureType.Polygon
               : type === Type.Line || type === Type.MultiLine
               ? TileFeatureType.Line
               : TileFeatureType.Point,
         tags
      }

      if (feature.id !== undefined) {
         tileFeature.id = feature.id
      }
      tile.features.push(tileFeature)
   }
}

/**
 * Create sub-tile at new zoom level and position and simplify its coordinates
 * to match.
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
         : options.tolerance / ((1 << z) * options.extent)

   const tile = copyTile(parent)
   const status = tile.status

   eachFeature(tile, f => {
      const { minX, minY, maxX, maxY } = f.status

      if (minX < status.minX) {
         status.minX = minX
      }
      if (minY < status.minY) {
         status.minY = minY
      }
      if (maxX > status.maxX) {
         status.maxX = maxX
      }
      if (maxY > status.maxY) {
         status.maxY = maxY
      }
   })

   return tile
}

type StackItem = [VectorTile, number, number, number]

/**
 * Split tiles into four sub-tiles, recursively. Splitting stops when maximum
 * zoom is reached or when the number of points is low as specified in the
 * options.
 *
 * Splitting is accomplished by duplicating the parent tile then clipping its
 * features to fit each of the child bounds.
 *
 * @param z Zoom
 */
export function splitTile(
   parent: VectorTile,
   options: Options,
   z: number,
   x: number,
   y: number
) {
   const stack: StackItem[] = [[parent, z, x, y]]
   let next: VectorTile | null

   while (stack.length > 0) {
      ;[next, z, x, y] = stack.pop()!

      const z2 = 1 << z
      const id = tileID(z, x, y)
      let tile = tileCache.get(id)

      if (tile === undefined) {
         tile = createTile(next, z, x, y, options)
         tileCache.set(id, tile)
         //usedCoord.add({ z, x, y });
      }

      if (
         z == options.maxTileZoom ||
         tile.status.pointCount <= options.maxTilePoints ||
         z == options.maxZoom
      ) {
         // stop splitting if max zoom is reached or tile is too simple to
         // warrant further splitting
         continue
      }

      if (next.status.featureCount === 0) {
         continue
      }

      // values used for clipping
      const k1 = (0.5 * options.buffer) / options.extent
      const k2 = 0.5 - k1
      const k3 = 0.5 + k1
      const k4 = 1 + k1
      const { minX, minY, maxX, maxY } = tile.status

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

      stack.push(tl, z + 1, x * 2, y * 2)
      stack.push(bl, z + 1, x * 2, y * 2 + 1)
      stack.push(tr, z + 1, x * 2 + 1, y * 2)
      stack.push(br, z + 1, x * 2 + 1, y * 2 + 1)
   }

   return tileCache.values()
}
