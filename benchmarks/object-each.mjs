import Benchmark from 'benchmark'
import process from 'process'

const suite = new Benchmark.Suite('Object each comparison')
const increment = n => n++
const size = 10000
const values = {}

for (let i = 0; i < size; i++) {
   values[`key-${i}`] = Math.random()
}

suite
   .add('for-in loop', () => {
      for (let key in values) {
         increment(values[key])
      }
   })
   .add('Object.keys().forEach()', () => {
      Object.keys(values).forEach(key => {
         increment(values[key])
      })
   })
   .on('start', function() {
      console.log(
         `${this.name} with Node ${process.version} and ${
            Object.keys(values).length
         } values\n`
      )
   })
   .on('cycle', event => {
      console.log(String(event.target))
   })
   .on('complete', function() {
      console.log('\nFastest is ' + this.filter('fastest').map('name'))
   })
   .run({ async: false })
