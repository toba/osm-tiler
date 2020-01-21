import { forEach, forEachKeyValue } from '@toba/tools'
import {
   VectorTile,
   VectorFeature,
   LayerMap,
   TileMetrics,
   Geometry,
   PointList,
   FeatureMetrics,
   Properties,
   Type
} from './types'

/**
 * Execute method for each feature in a tile, across all layers.
 */
export function eachFeature(
   tile: VectorTile,
   fn: (f: VectorFeature, layeName: string) => void
) {
   forEachKeyValue(tile.layers, (name, layer) => {
      forEach(layer.features, f => fn(f, name))
   })
}

export function eachPoint(
   line: PointList,
   fn: (x: number, y: number, zoom: number) => void
) {
   for (let i = 0; i < line.length; i += 3) {
      fn(line[i], line[i + 1], line[i + 2])
   }
}

/**
 * Create a unique ID based on tile coordinate.
 */
export const tileID = (z: number, x: number, y: number) =>
   ((1 << z) * y + x) * 32 + z

export const emptyTileMetrics = (x = 0, y = 0, z = 0): TileMetrics => ({
   pointCount: 0,
   simplifiedCount: 0,
   featureCount: 0,
   x,
   y,
   z,
   complete: false,
   minX: 2,
   minY: 1,
   maxX: -1,
   maxY: 0
})

export const emptyFeatureMetrics = (
   geometry: Geometry = [[]]
): FeatureMetrics => ({
   minX: 2,
   minY: 1,
   maxX: -1,
   maxY: 0,
   geometry
})

export const emptyFeature = (): VectorFeature => ({
   type: Type.Unknown,
   geometry: [],
   properties: new Object(null) as Properties,
   metrics: emptyFeatureMetrics()
})

export function copyProperties(source: Properties): Properties {
   const out = new Object(null) as Properties
   forEachKeyValue(source, (key, value) => {
      out[key] = value
   })
   return out
}

export function copyGeometry(g: Geometry): Geometry {
   const out: Geometry = []
   forEach(g, line => out.push(line.slice()))
   return out
}

export const copyFeature = (
   f: VectorFeature,
   includeGeometry = false
): VectorFeature => ({
   id: f.id,
   type: f.type,
   geometry: includeGeometry ? copyGeometry(f.geometry) : [],
   properties: copyProperties(f.properties),
   metrics: emptyFeatureMetrics(f.geometry)
})

export const enum FeatureInclude {
   Nothing,
   Basic,
   Geometry
}

export function copyLayers(
   layers: LayerMap,
   include = FeatureInclude.Basic
): LayerMap {
   const out = new Object(null) as LayerMap
   forEachKeyValue(layers, (name, l) => {
      out[name] = {
         version: l.version,
         name,
         extent: l.extent,
         features:
            include == FeatureInclude.Nothing
               ? []
               : l.features.map(f =>
                    copyFeature(f, include == FeatureInclude.Geometry)
                 )
      }
   })
   return out
}

/**
 * Copy tile layers but no metrics.
 */
export const copyTile = (
   tile: VectorTile,
   includeGeometry = false
): VectorTile => ({
   layers: copyLayers(
      tile.layers,
      includeGeometry ? FeatureInclude.Geometry : FeatureInclude.Basic
   ),
   metrics: emptyTileMetrics()
})
