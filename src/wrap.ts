import { GeoJsonType as Type } from '@toba/map'
import { forEach } from '@toba/node-tools'
import { clip } from './clip'
import {
   Options,
   PointList,
   Geometry,
   VectorFeature,
   VectorTile
} from './types'

function shiftCoords(points: PointList, offset: number): PointList {
   const newPoints: PointList = []
   newPoints.size = points.size

   if (points.start !== undefined) {
      newPoints.start = points.start
      newPoints.end = points.end
   }

   for (let i = 0; i < points.length; i += 3) {
      newPoints.push(points[i] + offset, points[i + 1], points[i + 2])
   }
   return newPoints
}

function shiftFeatureCoords(features: PointList[], offset: number) {
   const newFeatures: PointList[] = []

   forEach(features, f => {
      const { type } = f

      let newGeometry: Geometry

      switch (type) {
         case Type.Point:
         case Type.MultiPoint:
         case Type.Line:
            newGeometry = shiftCoords(f.geometry as MemLine, offset)
            break
         case Type.MultiLine:
         case Type.Polygon:
            newGeometry = (f.geometry as MemPolygon).map(line =>
               shiftCoords(line, offset)
            )
            break
         case Type.MultiPolygon:
            newGeometry = (f.geometry as MemPolygon[]).map(p =>
               p.map(line => shiftCoords(line, offset))
            )
            break
         default:
            newGeometry = []
      }

      newFeatures.push(createFeature(f.id, type, newGeometry, f.tags))
   })

   return newFeatures
}

/**
 * Date line processing
 */
export function wrap(tile: VectorTile, options: Options): VectorTile {
   const buffer = options.buffer / options.extent
   /** Center world copy */
   let merged = tile
   /** Left world copy */
   const left = clip(tile, 1, -1 - buffer, buffer, 0, -1, 2)
   /** Right world copy */
   const right = clip(tile, 1, 1 - buffer, 2 + buffer, 0, -1, 2)

   if (left || right) {
      merged = clip(tile, 1, -buffer, 1 + buffer, 0, -1, 2) ?? []

      if (left) {
         // merge left into center
         merged = shiftFeatureCoords(tile, 1).concat(merged)
      }
      if (right) {
         // merge right into center
         merged = merged.concat(shiftFeatureCoords(right, -1))
      }
   }

   return merged
}
