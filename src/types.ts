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

export type Point = [number, number];
export type Line = Point[];

/**
 * Array of numbers in groups of three such that the first is the `x`
 * coordinate, next is the `y` coordinate and last is the zoom level.
 *
 * @example
 * [ax, ay, az, bx, by, bz]
 */
export interface PointList extends Array<number> {
   /**
    * Type-specific size of items. For example, if the items describe a line
    * then size may be a measured distance, whereas if they describe a polygon
    * then the size could be an area.
    */
   size?: number;
   start?: number;
   end?: number;
}

/**
 * Geometry data in a Vector Tile is defined in a screen coordinate system. The
 * upper left corner of the tile (as displayed by default) is the origin of the
 * coordinate system. The X axis is positive to the right, and the Y axis is
 * positive downward. Coordinates within a geometry *must* be integers.
 *
 * @see https://github.com/mapbox/vector-tile-spec/tree/master/2.1#43-geometry-encoding
 */
export type Geometry = Line[];

export interface VectorFeature {
   id?: number;
   type: Type;
   properties: { [key: string]: string };
   geometry: Geometry;
}

export interface VectorLayer {
   version?: number;
   /** Unique name that may be targeted with styling rules */
   name?: string;
   extent?: number;
   features: VectorFeature[];
}

export interface VectorTile {
   layers: { [key: string]: VectorLayer };
   // fields below are used only for tile processing -- they aren't serialized
   // to the final tire
   pointCount: number;
   featureCount: number;
   simplifiedCount: number;
   x: number;
   y: number;
   z: number;
   transformed: boolean;
   minX: number;
   minY: number;
   maxX: number;
   maxY: number;
}

/**
 * Indicates an axis: `0` for `x` or horizontal, `1` for `y` or vertical.
 */
export const enum Axis {
   Horizontal,
   Vertical
}
