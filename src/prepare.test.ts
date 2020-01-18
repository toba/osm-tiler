import path from 'path';
import { readFileText } from '@toba/test';
import { prepare } from './prepare';
import { defaultOptions } from './index';

const options = defaultOptions;
let res: any;

beforeAll(async () => {
   const js = await readFileText(
      path.join(__dirname, '__mocks__', 'overpass-blacks-creek-road.json')
   );
   expect(js).toBeDefined();
   res = JSON.parse(js);
});

it('converts Overpass JSON response to intermediate tile', () => {
   const tile = prepare(res, options);
   expect(tile).toBeDefined();
});
