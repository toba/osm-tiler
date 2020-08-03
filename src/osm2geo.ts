const Way = {
   center: (way: OverpassWay): OverpassNode => ({
      id: way.id,
      type: 'node',
      lat: way.center!.lat,
      lon: way.center!.lon,
      __isCenterPlaceholder: true,
   }),

   bounds(source: OverpassWay, ways: OverpassWay[]): OverpassNode[] {
      const way: OverpassWay = { ...source, nodes: [] }
      const nodes: OverpassNode[] = []

      const addNode = (lat: number, lon: number, i: number) => {
         const n: OverpassNode = {
            type: 'node',
            id: `_${source.type}/${source.id}bounds${i}`,
            lat,
            lon,
         }
         way.nodes.push(n.id)
         nodes.push(n)
      }

      addNode(way.bounds!.minlat, way.bounds!.minlon, 1)
      addNode(way.bounds!.maxlat, way.bounds!.minlon, 2)
      addNode(way.bounds!.maxlat, way.bounds!.maxlon, 3)
      addNode(way.bounds!.minlat, way.bounds!.maxlon, 4)

      way.nodes.push(way.nodes[0])
      way.__isBoundsPlaceholder = true

      ways.push(way)

      return nodes
   },

   full(way: OverpassWay) {
      const nodes: OverpassNode[] = []
      const addNode = (lat: number, lon: number, id: ElementID) => {
         nodes.push({ type: 'node', id, lat, lon })
      }

      if (!Array.isArray(way.nodes)) {
         way.nodes = way.geometry!.map((n) =>
            n === null
               ? '_anonymous@unknown_location'
               : `_anonymous@${n.lat}/${n.lon}`
         )
      }

      way.geometry!.filter((n) => n !== null).forEach((n, i) => {
         addNode(n!.lat, n!.lon, way.nodes[i])
      })

      return nodes
   },
}

function parse(res: OverpassResponse) {
   const nodes: OverpassNode[] = []
   const ways: OverpassWay[] = []
   const rels: OverpassRelation[] = []

   res.elements.forEach((el) => {
      switch (el.type) {
         case 'node':
            nodes.push(el as OverpassNode)
            break
         case 'way': {
            const way = { ...el } as OverpassWay
            ways.push(way)
            if (way.center) nodes.push(Way.center(way))

            if (way.geometry) {
               nodes.push(...Way.full(way))
            } else if (way.bounds) {
               nodes.push(...Way.bounds(way, ways))
            }

            break
         }
         case 'relation':
            break
         default:
            break
      }
   })
}
