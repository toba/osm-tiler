import '@toba/test';
import fs from 'fs';
import path from 'path';
import { Encoding } from '@toba/tools';
import { GeoJsonType as Type } from '@toba/map';
import { geojsonvt } from './index';
import { LogLevel, TileFeatureType } from './types';

const getJSON = (name: string) =>
   JSON.parse(
      fs.readFileSync(path.join(__dirname, '__mocks__', name), {
         encoding: Encoding.UTF8
      })
   );

const square = [
   {
      geometry: [
         [
            [-64, 4160],
            [-64, -64],
            [4160, -64],
            [4160, 4160],
            [-64, 4160]
         ]
      ],
      type: 3,
      tags: { name: 'Pennsylvania', density: 284.3 },
      id: '42'
   }
];

it('getTile: us-states.json', () => {
   const log = console.log;
   console.log = () => {};
   const index = geojsonvt(getJSON('us-states.json'), { debug: LogLevel.All });

   expect(index.getTile(7, 37, 48)?.features).toEqual(
      getJSON('us-states-z7-37-48.json')
   );

   expect(index.getTile(9, 148, 192)?.features).toEqual(square);
   expect(index.getTile(11, 800, 400)).toBeNull();
   expect(index.getTile(-5, 123.25, 400.25)).toBeNull();
   expect(index.getTile(25, 200, 200)).toBeNull();

   console.log = log;

   expect(index.total).toBe(37);
});

it('getTile: unbuffered tile left/right edges', () => {
   const index = geojsonvt(
      {
         type: Type.Line,
         coordinates: [
            [0, 90],
            [0, -90]
         ]
      },
      {
         buffer: 0
      }
   );

   expect(index.getTile(2, 1, 1)).toBeNull();
   expect(index.getTile(2, 2, 1)?.features).toEqual([
      {
         geometry: [
            [
               [0, 0],
               [0, 4096]
            ]
         ],
         type: TileFeatureType.Line,
         tags: null
      }
   ]);
});

it('getTile: unbuffered tile top/bottom edges', () => {
   const index = geojsonvt(
      {
         type: Type.Line,
         coordinates: [
            [-90, 66.51326044311188],
            [90, 66.51326044311188]
         ]
      },
      {
         buffer: 0
      }
   );

   expect(index.getTile(2, 1, 0)?.features).toEqual([
      {
         geometry: [
            [
               [0, 4096],
               [4096, 4096]
            ]
         ],
         type: TileFeatureType.Line,
         tags: null
      }
   ]);
   expect(index.getTile(2, 1, 1)?.features).toEqual([]);
});

it('getTile: polygon clipping on the boundary', () => {
   const index = geojsonvt(
      {
         type: Type.Polygon,
         coordinates: [
            [
               [42.1875, 57.32652122521708],
               [47.8125, 57.32652122521708],
               [47.8125, 54.16243396806781],
               [42.1875, 54.16243396806781],
               [42.1875, 57.32652122521708]
            ]
         ]
      },
      {
         buffer: 1024
      }
   );

   expect(index.getTile(5, 19, 9)?.features).toEqual([
      {
         geometry: [
            [
               [3072, 3072],
               [5120, 3072],
               [5120, 5120],
               [3072, 5120],
               [3072, 3072]
            ]
         ],
         type: TileFeatureType.Polygon,
         tags: null
      }
   ]);
});
