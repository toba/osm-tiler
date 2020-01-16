import { VectorFeature } from './types';

export class FeatureWrapper extends VectorFeature {
   id: number;
   type: number;
   rawGeometry: number[];
   geometry: number[];
   properties: { [key: string]: string };
   extent: number;

   constructor(feature, extent: number) {
      this.id = typeof feature.id === 'number' ? feature.id : undefined;
      this.type = feature.type;
      this.rawGeometry =
         feature.type === 1 ? [feature.geometry] : feature.geometry;
      this.properties = feature.tags;
      this.extent = extent || 4096;
   }

   loadGeometry() {
      const rings = this.rawGeometry;
      this.geometry = [];

      for (let i = 0; i < rings.length; i++) {
         const ring = rings[i];
         const newRing = [];
         for (let j = 0; j < ring.length; j++) {
            newRing.push(new Point(ring[j][0], ring[j][1]));
         }
         this.geometry.push(newRing);
      }
      return this.geometry;
   }

   bbox() {
      if (!this.geometry) {
         this.loadGeometry();
      }

      const rings = this.geometry;
      let x1 = Infinity;
      let x2 = -Infinity;
      let y1 = Infinity;
      let y2 = -Infinity;

      for (let i = 0; i < rings.length; i++) {
         const ring = rings[i];

         for (let j = 0; j < ring.length; j++) {
            const coord = ring[j];

            x1 = Math.min(x1, coord.x);
            x2 = Math.max(x2, coord.x);
            y1 = Math.min(y1, coord.y);
            y2 = Math.max(y2, coord.y);
         }
      }

      return [x1, y1, x2, y2];
   }

   toGeoJSON = VectorTileFeature.prototype.toGeoJSON;
}
