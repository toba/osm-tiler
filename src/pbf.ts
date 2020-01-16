import PBF from 'pbf';
import { VectorFeature, Layer, VectorTile } from './types';

interface Context {
   feature: VectorFeature;
   keys: string[];
   values: string[];
   keycache: { [key: number]: string };
   valuecache: { [key: number]: string };
}

export const enum Command {
    MoveTo = 1,
    LineTo = 2
}

/**
 * Serialized a geojson-vt-created tile to pbf.
 *
 * @param {Object} layers - An object mapping layer names to geojson-vt-created vector tile objects
 * @param {Object} [options] - An object specifying the vector-tile specification version and extent that were used to create `layers`.
 * @param {Number} [options.version=1] - Version of vector-tile spec used
 * @param {Number} [options.extent=4096] - Extent of the vector tile
 * @return {Buffer} uncompressed, pbf-serialized tile data
 */
function fromGeojsonVt(layers: Layer[], options) {
   options = options || {};
   const l: Layer = {};

   Object.keys(layers).forEach(k => {

     l[k] = new GeoJSONWrapper(layers[k].features, options);
      l[k].name = k;
      l[k].version = options.version;
      l[k].extent = options.extent;
   }
   return fromVectorTileJs({ layers: l });
});

function writeProperties(context: Context, pbf: PBF) {
   const feature = context.feature;
   const keys = context.keys;
   const values = context.values;
   const keycache = context.keycache;
   const valuecache = context.valuecache;

   for (const key in feature.properties) {
      let keyIndex = keycache[key];
      if (typeof keyIndex === 'undefined') {
         keys.push(key);
         keyIndex = keys.length - 1;
         keycache[key] = keyIndex;
      }
      pbf.writeVarint(keyIndex);

      let value = feature.properties[key];
      const type = typeof value;
      
      if (type !== 'string' && type !== 'boolean' && type !== 'number') {
         value = JSON.stringify(value);
      }
      const valueKey = type + ':' + value;
      let valueIndex = valuecache[valueKey];

      if (typeof valueIndex === 'undefined') {
         values.push(value);
         valueIndex = values.length - 1;
         valuecache[valueKey] = valueIndex;
      }
      pbf.writeVarint(valueIndex);
   }
}

function command(cmd: Command, length: number) {
   return (length << 3) + (cmd & 0x7);
}



function zigzag(num: number): number {
   return (num << 1) ^ (num >> 31);
}

function writeGeometry(feature: VectorFeature, pbf: PBF) {
   const geometry = feature.loadGeometry();
   const type = feature.type;
   let x = 0;
   let y = 0;
   const rings = geometry.length;

   for (let r = 0; r < rings; r++) {
      const ring = geometry[r];
      let count = 1;
      
      if (type === 1) {
         count = ring.length;
      }
      pbf.writeVarint(command(Command.MoveTo, count));
      
      // do not write polygon closing path as lineto
      const lineCount = type === 3 ? ring.length - 1 : ring.length;
      
      for (let i = 0; i < lineCount; i++) {
         if (i === 1 && type !== 1) {
            pbf.writeVarint(command(Command.LineTo, lineCount - 1));
         }
         const dx = ring[i].x - x;
         const dy = ring[i].y - y;
         pbf.writeVarint(zigzag(dx));
         pbf.writeVarint(zigzag(dy));
         x += dx;
         y += dy;
      }
      if (type === 3) {
         pbf.writeVarint(command(7, 1)); // closepath
      }
   }
}

function writeFeature(context: Context, pbf: PBF) {
   const feature = context.feature;

   if (feature.id !== undefined) {
      pbf.writeVarintField(1, feature.id);
   }

   pbf.writeMessage(2, writeProperties, context);
   pbf.writeVarintField(3, feature.type);
   pbf.writeMessage(4, writeGeometry, feature);
}

function writeValue(value: string | boolean | number, pbf: PBF) {
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

function writeLayer(layer: Layer, pbf: PBF) {
   pbf.writeVarintField(15, layer.version ?? 1);
   pbf.writeStringField(1, layer.name ?? '');
   pbf.writeVarintField(5, layer.extent ?? 4096);

   let i: number;
   const context: Partial<Context> = {
      keys: [],
      values: [],
      keycache: {},
      valuecache: {}
   };

   for (i = 0; i < layer.length; i++) {
      context.feature = layer.feature(i);
      pbf.writeMessage(2, writeFeature, context);
   }

   const keys = context.keys;
   for (i = 0; i < keys.length; i++) {
      pbf.writeStringField(3, keys[i]);
   }

   const values = context.values;
   for (i = 0; i < values.length; i++) {
      pbf.writeMessage(4, writeValue, values[i]);
   }
}

function writeTile(tile: VectorTile, pbf: PBF) {
   Object.keys(tile.layers).forEach(key => {
      pbf.writeMessage(3, writeLayer, tile.layers[key]);
   });
}

/**
 * Serialize a vector-tile-js-created tile to pbf
 * @return uncompressed, pbf-serialized tile data
 */
function fromVectorTileJs(tile: VectorTile): Uint8Array {
   const out = new PBF();
   writeTile(tile, out);
   return out.finish();
}
