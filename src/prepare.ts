import { forEach } from '@toba/node-tools'
import {
   OverpassResponse,
   OverpassWay,
   ItemType,
   OverpassNode,
   OverpassElement
} from '@toba/osm-models'
import {
   VectorTile,
   Point,
   VectorFeature,
   Type,
   Options,
   Geometry,
   Properties
} from './types'
import { Schema } from './schema'
import { emptyTileMetrics } from './tools'

/**
 * Translate latitude from WSG84 to unit square.
 */
const projectX = (x: number): number => x / 360 + 0.5

/**
 * Translate longitude from WSG84 to unit square.
 */
function projectY(y: number): number {
   const sin = Math.sin((y * Math.PI) / 180)
   const y2 = 0.5 - (0.25 * Math.log((1 + sin) / (1 - sin))) / Math.PI
   return y2 < 0 ? 0 : y2 > 1 ? 1 : y2
}

/**
 * Divide elements into layers according to the OpenMapTiles Vector Tile Schema.
 * @see https://openmaptiles.org/schema/
 */
export function inferLayer(el: OverpassElement, options: Options): Schema {
   // TODO: map elements to layer names
   return Schema.Transportation
}

/**
 * Create initial `VectorTile` from Overpass response. This initial "tile"
 * exists only temporarily to hold data in the expected format. It must be
 * split into proper tiles before serving to a map.
 */
export function prepare(res: OverpassResponse, options: Options): VectorTile {
   /** Nodes keyed to their OSM ID */
   const nodes = new Map<number, Point>()
   /** Ways keyed to a layer name */
   const layers = new Map<string, OverpassWay[]>()

   let pointCount = 0
   let featureCount = 0

   forEach(res.elements, el => {
      switch (el.type) {
         case ItemType.Node: {
            const n = el as OverpassNode
            nodes.set(n.id, [projectX(n.lat), projectY(n.lon)])
            pointCount++
            break
         }
         case ItemType.Way: {
            const layerName = inferLayer(el, options)
            if (!layers.has(layerName)) {
               layers.set(layerName, [])
            }
            layers.get(layerName)!.push(el as OverpassWay)
            featureCount++
            break
         }
         case ItemType.Relation:
            // TODO: handle relations
            break
         default:
            break
      }
   })

   const tile: VectorTile = {
      layers: {},
      metrics: {
         ...emptyTileMetrics(),
         pointCount,
         featureCount
      }
   }

   layers.forEach((ways, name) => {
      tile.layers[name] = {
         features: ways.map(w => {
            const geometry: Geometry = [[]]
            /** Last `x` coordinate */
            let x0 = 0
            /** Last `y` coordinate */
            let y0 = 0
            /** Length of line or area of polygon */
            let size = 0

            forEach(w.nodes, (id, i) => {
               if (nodes.has(id)) {
                  const n = nodes.get(id)!
                  const x = n[0]
                  const y = n[1]
                  geometry[0].push(x, y, 0)

                  if (i > 0) {
                     size += isPolygon
                        ? // area
                          (x0 * y - x * y0) / 2
                        : // length
                          Math.sqrt((x - x0) ** 2 + (y - y0) ** 2)
                  }
                  x0 = x
                  y0 = y
               }
            })

            return {
               type: Type.Line,
               properties: new Object(null) as Properties,
               geometry
            } as VectorFeature
         })
      }
   })

   return tile
}
