/**
 * @see https://github.com/mapbox/vector-tile-spec/tree/master/2.1#434-geometry-types
 */
export const enum Type {
   /**
    * The specification purposefully leaves an unknown geometry type as an
    * option. This geometry type encodes experimental geometry types that an
    * encoder *may* choose to implement. Decoders *may* ignore any features of
    * this geometry type.
    */
   Unknown = 0,
   Point = 1,
   Line = 2,
   Polygon = 3
}

/**
 * A `Command` is combined with the number of times it should be executed to
 * form an unsigned `CommandInteger` in the protocol buffer.
 *
 * @example
 * CommandInteger = (id & 0x7) | (count << 3)
 * id = CommandInteger & 0x7
 * count = CommandInteger >> 3
 *
 * @see https://github.com/mapbox/vector-tile-spec/tree/master/2.1#431-command-integers
 */
export const enum Command {
   MoveTo = 1,
   LineTo = 2,
   ClosePath = 7
}

export type Point = [number, number]
export type Line = Point[]

/**
 * Array of numbers in groups of two or three such that the first is the `x`
 * coordinate, next is the `y` coordinate and, for 3D lists, last is the zoom
 * level.
 *
 * @example
 * [ax, ay, az, bx, by, bz]
 * [ax, ay, bx, by]
 */
export interface PointList extends Array<number> {
   /**
    * Size represented by the points. For lines, this is the length. For lines
    * that enclose an area, this will be the area.
    */
   size?: number
}

/**
 * Geometry data in a Vector Tile is defined in a screen coordinate system. The
 * upper left corner of the tile (as displayed by default) is the origin of the
 * coordinate system. The X axis is positive to the right, and the Y axis is
 * positive downward. Coordinates within a geometry *must* be integers.
 *
 * @see https://github.com/mapbox/vector-tile-spec/tree/master/2.1#43-geometry-encoding
 */
export type Geometry = PointList[]

/**
 * Transformation status and metadata.
 */
export interface Metrics {
   minX: number
   minY: number
   maxX: number
   maxY: number
}

export interface TileMetrics extends Metrics {
   x: number
   y: number
   z: number
   complete: boolean
   pointCount: number
   featureCount: number
   simplifiedCount: number
}

export interface FeatureMetrics extends Metrics {
   /** Original geometry from Overpass */
   geometry: Geometry
}

export type Properties = { [key: string]: string | number }

export interface VectorFeature {
   id?: number
   type: Type
   properties: Properties
   /**
    * All feature types are stored as `number[][]`
    * @example
    *   point = [[89,23,0]]
    *    line = [[3,4,0, 8,9,0, 15,18,0]]
    * polygon = [[3,4,0, 8,9,0, 15,18,0],[12,89,0, 34,56,0]]
    */
   geometry: Geometry
   /**
    * `metrics` properties are not part of the vector tile specification but are
    * used to facilitate processing
    */
   metrics: FeatureMetrics
}

export interface VectorLayer {
   version?: number
   /** Unique name that may be targeted with styling rules */
   name?: string
   extent?: number
   features: VectorFeature[]
}

export type LayerMap = { [key: string]: VectorLayer }

export interface VectorTile {
   layers: LayerMap
   /**
    * `metrics` properties are not part of the vector tile specification but are
    * used to facilitate processing
    */
   metrics: TileMetrics
}

/**
 * Indicates an axis: `0` for `x` or horizontal, `1` for `y` or vertical.
 */
export const enum Axis {
   Horizontal,
   Vertical
}

/**
 * Object specifying the vector-tile specification version and extent that were
 * used to create `layers`.
 */
export interface Options {
   /**
    * Version of vector-tile spec used
    * @see https://docs.mapbox.com/vector-tiles/specification/#versioning
    */
   version: number
   /** Maximum zoom (`0-24`) to preserve detail on */
   maxZoom: number
   /** Simplification tolerance (higher means simpler) */
   tolerance: number
   /** Tile height and width */
   extent: number
   /** Tile buffer on each side */
   buffer: number
   /** Name of a feature property to be promoted to `feature.id` */
   promoteID?: string
   /** Whether to generate feature IDs. Cannot be used with `promoteID`. */
   generateID: boolean
   /** Maximum zoom tile */
   maxTileZoom: number
   /** Maximum number of points per tile */
   maxTilePoints: number
}
