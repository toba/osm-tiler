[![npm package](https://img.shields.io/npm/v/@toba/osm-tiler.svg)](https://www.npmjs.org/package/@toba/osm-tiler)
[![Build Status](https://travis-ci.org/toba/osm-tiler.svg?branch=master)](https://travis-ci.org/toba/osm-tiler)
![Code style](https://img.shields.io/badge/code_style-prettier-ff69b4.svg)
[![Dependencies](https://img.shields.io/david/toba/osm-tiler.svg)](https://david-dm.org/toba/osm-tiler)
[![DevDependencies](https://img.shields.io/david/dev/toba/osm-tiler.svg)](https://david-dm.org/toba/osm-tiler#info=devDependencies&view=list)
[![Test Coverage](https://codecov.io/gh/toba/osm-tiler/branch/master/graph/badge.svg)](https://codecov.io/gh/toba/osm-tiler)

<img src='https://toba.github.io/about/images/logo-colored.svg' width="100" align="right"/>

# Toba OSM Tiler

Rather than a multi-step process like

`osm pbf` ➡ `imposm` ➡ elaborate SQL ➡ write pbf

this library means to convert [Overpass API](https://overpass-turbo.eu/) `JSON` results directly to
[MapBox vector tiles](https://docs.mapbox.com/vector-tiles/specification/) in order to facilitate scenarios like near-realtime usage of open source data and lightweight preparation for offline modes.

This library relies extensively on open source work shared generously by MapBox, particularly

-  [mapbox/pbf](https://github.com/mapbox/pbf)
-  [mapbox/geojson-vt](https://github.com/mapbox/geojson-vt)

https://wiki.osgeo.org/wiki/Tile_Map_Service_Specification

## License
