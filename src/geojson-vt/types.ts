import { GeoJsonProperties, GeoJsonTypes } from 'geojson'

export type MemGeometry = MemLine | MemPolygon | MemPolygon[]

export type MemPolygon = MemLine[]

/**
 * Array of numbers in groups of three such that the first is the `x`
 * coordinate, next is the `y` coordinate and last is the zoom level.
 *
 * @example
 * [ax, ay, az, bx, by, bz]
 */
export interface MemLine extends Array<number> {
   /**
    * Type-specific size of items. For example, if the items describe a line
    * then size may be a measured distance, whereas if they describe a polygon
    * then the size could be an area.
    */
   size?: number
   start?: number
   end?: number
}

export interface Coordinate {
   x: number
   y: number
   /** Zoom */
   z: number
}

export const enum LogLevel {
   None,
   Basic,
   All
}

/**
 * Indicates an axis: `0` for `x` or horizontal, `1` for `y` or vertical.
 */
export const enum Axis {
   Horizontal,
   Vertical
}

export interface Options {
   /** Maximum zoom (`0-24`) to preserve detail on */
   maxZoom: number
   /** Simplification tolerance (higher means simpler) */
   tolerance: number
   /** Tile extent */
   extent: number
   /** Tile buffer on each side */
   buffer: number
   /** Name of a feature property to be promoted to `feature.id` */
   promoteID?: string
   /** Whether to generate feature IDs. Cannot be used with `promoteID`. */
   generateID: boolean
   /** Whether to calculate line metrics */
   lineMetrics: boolean
   debug: LogLevel
   /** Maximum zoom in the tile index */
   indexMaxZoom: number
   /** Maximum number of points per tile in the tile index */
   indexMaxPoints: number
}

/**
 * Intermediate projected JSON vector format with simplification data.
 */
export interface MemFeature {
   id?: string | number
   type: GeoJsonTypes
   geometry: MemGeometry
   /** Minimum `x` coordinate in the `geometry` */
   minX: number
   /** Minimum `y` coordinate in the `geometry` */
   minY: number
   /** Maximum `x` coordinate in the `geometry` */
   maxX: number
   /** Maximum `y` coordinate in the `geometry` */
   maxY: number
   tags: GeoJsonProperties
}

export interface Tile {
   /** Whether tile coordinates have already been transformed to tile space */
   transformed: boolean
   numPoints: number
   numSimplified: number
   numFeatures: number
   source?: MemFeature[]
   x: number
   y: number
   z: number
   /** Minimum `x` coordinate in the `features` */
   minX: number
   /** Minimum `y` coordinate in the `features` */
   minY: number
   /** Maximum `x` coordinate in the `features` */
   maxX: number
   /** Maximum `y` coordinate in the `features` */
   maxY: number
   features: TileFeature[]
}

export type TilePoint = [number, number]

export type TileLine = TilePoint[]

export interface TileFeature {
   id?: string | number
   type: TileFeatureType
   geometry: number[] | TileLine | TileLine[]
   tags: GeoJsonProperties
}

export interface Slice {
   size: number
   start: number
   end: number
}

export const enum TileFeatureType {
   Point = 1,
   /** From GeoJSON `Line` or `MultiLine` */
   Line = 2,
   /** From GeoJSON `Polygon` or `MultiPolygon` */
   Polygon = 3
}

export const enum VectorFeatureType {
   Unknown = 'Unknown',
   Point = 'Point',
   Line = 'LineString',
   Polygon = 'Polygon'
}

/**
 * @see https://github.com/mapbox/vt-pbf/blob/master/lib/geojson_wrapper.js
 */
export interface VectorFeature {
   id?: number
   properties: {}
   extent: number
   type: number

   _geometry: number
   _keys: number
   _values: number

   loadGeometry(): number[][]
   bbox(): [number, number, number, number]
}

/**
 * @see https://github.com/mapbox/vector-tile-js/blob/master/lib/vectortilelayer.js
 */
export interface Layer {
   version: number
   name: string
   extent: number
   length: number
   _keys: number[]
   _values: number[]
   _features: VectorFeature[]

   feature(index: number): VectorFeature
}

export interface VectorTile {
   layers: { [name: string]: Layer }
}
