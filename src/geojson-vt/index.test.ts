import '@toba/test'
import fs from 'fs'
import path from 'path'
import { Encoding } from '@toba/tools'
import { GeoJSON } from 'geojson'
import { geojsonvt } from './index'
import { Options, TileFeature } from './types'

const getJSON = (name: string) =>
   JSON.parse(
      fs.readFileSync(path.join(__dirname, '__mocks__', name + '.json'), {
         encoding: Encoding.UTF8
      })
   )

function genTiles(data: GeoJSON, options: Partial<Options> = {}) {
   const index = geojsonvt(
      data,
      // eslint-disable-next-line
      Object.assign(
         {
            indexMaxZoom: 0,
            indexMaxPoints: 10000
         },
         options
      )
   )

   const output: { [key: string]: TileFeature[] | undefined } = {}

   Object.keys(index.tiles).forEach(id => {
      const tile = index.tiles[id]
      const z = tile.z
      output[`z${z}-${tile.x}-${tile.y}`] = index.getTile(
         z,
         tile.x,
         tile.y
      )?.features
   })

   return output
}

function testTiles(
   inputFile: string,
   expectedFile: string,
   options: Partial<Options>
) {
   it(`full tiling test: ${expectedFile.replace('-tiles.json', '')}`, () => {
      const tiles = genTiles(getJSON(inputFile), options)
      expect(tiles).toEqual(getJSON(expectedFile))
   })
}

testTiles('us-states', 'us-states-tiles', {
   indexMaxZoom: 7,
   indexMaxPoints: 200
})
testTiles('dateline', 'dateline-tiles', {
   indexMaxZoom: 0,
   indexMaxPoints: 10000
})
testTiles('dateline', 'dateline-metrics-tiles', {
   indexMaxZoom: 0,
   indexMaxPoints: 10000,
   lineMetrics: true
})
testTiles('feature', 'feature-tiles', {
   indexMaxZoom: 0,
   indexMaxPoints: 10000
})
testTiles('collection', 'collection-tiles', {
   indexMaxZoom: 0,
   indexMaxPoints: 10000
})
testTiles('single-geom', 'single-geom-tiles', {
   indexMaxZoom: 0,
   indexMaxPoints: 10000
})
testTiles('ids', 'ids-promote-id-tiles', {
   indexMaxZoom: 0,
   promoteID: 'prop0'
})
testTiles('ids', 'ids-generate-id-tiles', {
   indexMaxZoom: 0,
   generateID: true
})

it('throws on invalid GeoJSON', () => {
   let err: Error | undefined

   try {
      genTiles({ type: 'Pologon' } as any)
   } catch (e) {
      err = e
   }
   expect(err).toBeDefined()
})

it('empty geojson', () => {
   expect(genTiles(getJSON('empty'))).toEqual({})
})

it('null geometry', () => {
   // should ignore features with null geometry
   expect(genTiles(getJSON('feature-null-geometry'))).toEqual({})
})
