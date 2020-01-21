import { loadJSON } from './__mocks__'
import { convert } from './convert'
import { defaultOptions } from './index'

const options = defaultOptions
let res: any

beforeAll(async () => {
   res = await loadJSON('overpass-blacks-creek-road')
})

it('converts Overpass JSON response to intermediate tile', () => {
   const tile = convert(res, options)
   expect(tile).toBeDefined()
})
