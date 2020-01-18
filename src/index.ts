import { forEach } from '@toba/tools';
import { OverpassResponse } from '@toba/osm-models';
import ProtocolBuffer from 'pbf';
import { prepare } from './prepare';
//import { convert } from './convert';
import { encodeTile } from './encode';
import { VectorTile, Options } from './types';
import { splitTile } from './split';

export const defaultOptions: Options = {
   version: 2.1,
   maxZoom: 14,
   maxTileZoom: 5,
   maxTilePoints: 100000,
   tolerance: 3,
   extent: 4096,
   buffer: 64,
   generateID: false
};

export function process(res: OverpassResponse, options: Options): Uint8Array[] {
   options = {
      ...defaultOptions,
      ...options
   };
   const oneBigTile: VectorTile = prepare(res, options);
   const tiles = splitTile(oneBigTile, options, 0, 0, 0);
   const out: Uint8Array[] = [];

   forEach(tiles, t => {
      const pbf = new ProtocolBuffer();
      encodeTile(t, pbf);
      out.push(pbf.finish());
   });

   return out;
}
