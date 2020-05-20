import { readFileText } from '@toba/test'
import path from 'path'

export async function loadJSON(name: string) {
   const js = await readFileText(path.join(__dirname, name + '.json'))
   if (js === undefined) {
      throw new Error(`Unable to read file ${name}.json in ${__dirname}`)
   }
   return JSON.parse(js)
}
