import '@toba/test'
import { loadJSON } from './__mocks__'
import { eachFeature } from './tools'
import { convert } from './convert'
import { defaultOptions } from './index'
import { VectorTile } from './types'

const options = defaultOptions
let tile: VectorTile

beforeAll(async () => {
   const res = await loadJSON('overpass-blacks-creek-road')
   tile = convert(res, options)
})

it('calls method for each feature in a tile', () => {
   const fn = jest.fn()
   eachFeature(tile, fn)
   expect(fn).toHaveBeenCalledTimes(49)
})
