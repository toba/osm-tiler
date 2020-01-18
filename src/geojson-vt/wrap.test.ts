import '@toba/test'
import { GeoJsonType as Type } from '@toba/map'
import { Feature } from 'geojson'
import { geojsonvt } from './index'

const leftPoint: Feature = {
   type: Type.Feature,
   properties: {},
   geometry: {
      coordinates: [-540, 0],
      type: Type.Point
   }
}

const rightPoint: Feature = {
   type: Type.Feature,
   properties: {},
   geometry: {
      coordinates: [540, 0],
      type: Type.Point
   }
}

it('handle point only in the rightside world', () => {
   const vt = geojsonvt(rightPoint)
   expect(vt.tiles[0].features[0].geometry[0]).toBe(1)
   expect(vt.tiles[0].features[0].geometry[1]).toBe(0.5)
})

test('handle point only in the leftside world', () => {
   const vt = geojsonvt(leftPoint)
   expect(vt.tiles[0].features[0].geometry[0]).toBe(0)
   expect(vt.tiles[0].features[0].geometry[1]).toBe(0.5)
})

test('handle points in the leftside world and the rightside world', () => {
   const vt = geojsonvt({
      type: Type.FeatureCollection,
      features: [leftPoint, rightPoint]
   })

   expect(vt.tiles[0].features[0].geometry[0]).toBe(0)
   expect(vt.tiles[0].features[0].geometry[1]).toBe(0.5)

   expect(vt.tiles[0].features[1].geometry[0]).toBe(1)
   expect(vt.tiles[0].features[1].geometry[1]).toBe(0.5)
})
