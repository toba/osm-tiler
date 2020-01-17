import ProtocolBuffer from 'pbf';
import { forEach } from '@toba/tools';
import { Command, VectorFeature, VectorLayer, VectorTile, Type } from './types';

/**
 * Layer context.
 */
interface Context {
   feature: VectorFeature;
   /** All feature property keys are combined at the layer level */
   keys: string[];
   /** All feature property value are combined at the layer level */
   values: string[];
   keyCache: { [key: string]: number };
   valueCache: { [key: string]: number };
}

const emptyFeature: VectorFeature = {
   type: Type.Unknown,
   properties: {},
   geometry: []
};

function writeProperties(context: Context, pbf: ProtocolBuffer) {
   const feature = context.feature;
   const keys = context.keys;
   const values = context.values;
   const keyCache = context.keyCache;
   const valueCache = context.valueCache;

   Object.keys(feature.properties).forEach(key => {
      let keyIndex = keyCache[key];
      if (typeof keyIndex === 'undefined') {
         keys.push(key);
         keyIndex = keys.length - 1;
         keyCache[key] = keyIndex;
      }
      pbf.writeVarint(keyIndex);

      let value = feature.properties[key];
      const type = typeof value;

      if (type !== 'string' && type !== 'boolean' && type !== 'number') {
         value = JSON.stringify(value);
      }
      const valueKey = type + ':' + value;
      let valueIndex = valueCache[valueKey];

      if (typeof valueIndex === 'undefined') {
         values.push(value);
         valueIndex = values.length - 1;
         valueCache[valueKey] = valueIndex;
      }
      pbf.writeVarint(valueIndex);
   });
}

/**
 * Encode a command and count as a `CommandInteger`.
 * @param count Times to execute the command
 * @see https://github.com/mapbox/vector-tile-spec/tree/master/2.1#431-command-integers
 */
const command = (cmd: Command, count = 1) => (count << 3) + (cmd & 0x7);

/**
 * ZigZag encode a number. This maps signed integers to unsigned integers so
 * that numbers with a small absolute value (for instance, -1) have a small
 * varint encoded value too.
 * @see https://developers.google.com/protocol-buffers/docs/encoding#signed-integers
 * @see https://github.com/mapbox/vector-tile-spec/tree/master/2.1#432-parameter-integers
 */
const zigzag = (num: number): number => (num << 1) ^ (num >> 31);

/**
 * @see https://github.com/mapbox/vector-tile-spec/tree/master/2.1#434-geometry-types
 */
function writeGeometry(feature: VectorFeature, pbf: ProtocolBuffer) {
   const geometry = feature.geometry;
   const type = feature.type;
   let x = 0;
   let y = 0;

   forEach(geometry, line => {
      let count = 1;

      if (type === Type.Point) {
         count = line.length;
      }
      pbf.writeVarint(command(Command.MoveTo, count));

      // do not write polygon closing path as lineto
      const pointCount = type === Type.Polygon ? line.length - 1 : line.length;

      for (let i = 0; i < pointCount; i++) {
         if (i === 1 && type !== Type.Point) {
            pbf.writeVarint(command(Command.LineTo, pointCount - 1));
         }
         const dx = line[i][0] - x;
         const dy = line[i][1] - y;
         pbf.writeVarint(zigzag(dx));
         pbf.writeVarint(zigzag(dy));
         x += dx;
         y += dy;
      }
      if (type === Type.Polygon) {
         pbf.writeVarint(command(Command.ClosePath));
      }
   });
}

function writeFeature(context: Context, pbf: ProtocolBuffer) {
   const feature = context.feature;

   if (feature.id !== undefined) {
      pbf.writeVarintField(1, feature.id);
   }

   pbf.writeMessage(2, writeProperties, context);
   pbf.writeVarintField(3, feature.type);
   pbf.writeMessage(4, writeGeometry, feature);
}

function writeValue(value: string | boolean | number, pbf: ProtocolBuffer) {
   const type = typeof value;
   if (type === 'string') {
      pbf.writeStringField(1, value as string);
   } else if (type === 'boolean') {
      pbf.writeBooleanField(7, value as boolean);
   } else if (type === 'number') {
      const num = value as number;

      if (num % 1 !== 0) {
         pbf.writeDoubleField(3, num);
      } else if (value < 0) {
         pbf.writeSVarintField(6, num);
      } else {
         pbf.writeVarintField(5, num);
      }
   }
}

function writeLayer(layer: VectorLayer, pbf: ProtocolBuffer) {
   pbf.writeVarintField(15, layer.version ?? 1);
   pbf.writeStringField(1, layer.name ?? '');
   pbf.writeVarintField(5, layer.extent ?? 4096);

   const context: Context = {
      keys: [],
      values: [],
      keyCache: {},
      valueCache: {},
      feature: emptyFeature
   };

   forEach(layer.features, f => {
      context.feature = f;
      pbf.writeMessage(2, writeFeature, context);
   });
   forEach(context.keys, k => pbf.writeStringField(3, k));
   forEach(context.values, v => pbf.writeMessage(4, writeValue, v));
}

function writeTile(tile: VectorTile, pbf: ProtocolBuffer) {
   Object.keys(tile.layers).forEach(key => {
      pbf.writeMessage(3, writeLayer, tile.layers[key]);
   });
}

/**
 * Serialize a vector-tile-js-created tile to pbf
 * @return uncompressed, pbf-serialized tile data
 */
// function fromVectorTileJs(tile: VectorTile): Uint8Array {
//    const out = new ProtocolBuffer();
//    writeTile(tile, out);
//    return out.finish();
// }

/**
 * Serialized a geojson-vt-created tile to pbf.
 * @return uncompressed, pbf-serialized tile data
 */
// function fromGeojsonVt(layers: {[key:string]: Layer}, options: Options): Uint8Array {
//    options = options || {};
//    const l: {[key: string]: TileWrapper};

//    Object.keys(layers).forEach(k => {
//      l[k] = new TileWrapper(layers[k].features, options);
//       l[k].name = k;
//       l[k].version = options.version;
//       l[k].extent = options.extent;
//    }
//    return fromVectorTileJs({ layers: l });
// };
