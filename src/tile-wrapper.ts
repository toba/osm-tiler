// const Point = require('@mapbox/point-geometry');
// const VectorTileFeature = require('@mapbox/vector-tile').VectorTileFeature;

export class TileWrapper {
   constructor(features, options) {
      this.options = options || {};
      this.features = features;
      this.length = features.length;
   }

   feature = (i: number) =>
      new FeatureWrapper(this.features[i], this.options.extent);
}

// // conform to vectortile api
// function GeoJSONWrapper(features, options) {
//    this.options = options || {};
//    this.features = features;
//    this.length = features.length;
// }
