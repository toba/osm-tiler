import { GeoJsonType as Type } from '@toba/map'
import { forEach } from '@toba/node-tools'
import {
   Options,
   MemFeature,
   Tile,
   TileFeature,
   MemLine,
   MemPolygon,
   TileFeatureType,
   TileLine
} from './types'

function eachPoint(
   line: MemLine,
   fn: (x: number, y: number, zoom: number) => void
) {
   for (let i = 0; i < line.length; i += 3) {
      fn(line[i], line[i + 1], line[i + 2])
   }
}

function rewind(line: number[], clockwise: boolean) {
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
   from: MemLine,
   tile: Tile,
   tolerance: number,
   isPolygon: boolean,
   isOuter: boolean
) {
   const sqTolerance = tolerance * tolerance

   if (
      tolerance > 0 &&
      (from.size ?? 0) < (isPolygon ? sqTolerance : tolerance)
   ) {
      tile.numPoints += from.length / 3
      return
   }

   const points: number[] = []

   eachPoint(from, (x, y, z) => {
      if (tolerance === 0 || z > sqTolerance) {
         tile.numSimplified++
         points.push(x, y)
      }
      tile.numPoints++
   })

   if (isPolygon) rewind(points, isOuter)

   out.push(points)
}

function addFeature(
   tile: Tile,
   feature: MemFeature,
   tolerance: number,
   options: Options
) {
   const geom = feature.geometry
   const { type } = feature
   const simplified: number[] | TileLine = []

   switch (type) {
      case Type.Point:
      case Type.MultiPoint:
         eachPoint(geom as MemLine, (x, y) => {
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
      case Type.MultiLine:
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
      case Type.MultiPolygon:
         forEach(geom as MemPolygon[], p =>
            forEach(p, (line, i) =>
               addLine(
                  simplified as TileLine,
                  line,
                  tile,
                  tolerance,
                  true,
                  i === 0
               )
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
 * Simplified tile generation.
 */
export function createTile(
   features: MemFeature[],
   z: number,
   x: number,
   y: number,
   options: Options
): Tile {
   const tolerance =
      z === options.maxZoom
         ? 0
         : options.tolerance / ((1 << z) * options.extent)

   const tile: Tile = {
      features: [],
      numPoints: 0,
      numSimplified: 0,
      numFeatures: features.length,
      source: undefined,
      x,
      y,
      z,
      transformed: false,
      minX: 2,
      minY: 1,
      maxX: -1,
      maxY: 0
   }

   forEach(features, f => {
      addFeature(tile, f, tolerance, options)

      const { minX, minY, maxX, maxY } = f

      if (minX < tile.minX) tile.minX = minX
      if (minY < tile.minY) tile.minY = minY
      if (maxX > tile.maxX) tile.maxX = maxX
      if (maxY > tile.maxY) tile.maxY = maxY
   })

   return tile
}
