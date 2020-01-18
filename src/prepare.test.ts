import { loadJSON } from './__mocks__';
import { prepare } from './prepare';
import { defaultOptions } from './index';

const options = defaultOptions;
let res: any;

beforeAll(async () => {
   res = await loadJSON('overpass-blacks-creek-road');
});

it('converts Overpass JSON response to intermediate tile', () => {
   const tile = prepare(res, options);
   expect(tile).toBeDefined();
});
