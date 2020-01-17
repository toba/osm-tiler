import { FeatureWrapper } from './feature-wrapper';
import { TileFeature } from './geojson-vt/types';

export class TileWrapper {
   options = {};
   features: TileFeature[] = [];
   length: number;

   constructor(features: TileFeature[], options) {
      this.options = options || {};
      this.features = features;
      this.length = features.length;
   }

   feature = (i: number) =>
      new FeatureWrapper(this.features[i], this.options.extent);
}
