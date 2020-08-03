const fullGeoPrefix = '_fullGeom'

const centerNode = (el: ProcessElement): OverpassNode => ({
   id: el.id,
   type: 'node',
   lat: el.center!.lat,
   lon: el.center!.lon,
   __isCenterPlaceholder: true,
})

function boundaryNodes(
   source: ProcessElement,
   ways: OverpassWay[]
): OverpassNode[] {
   const way: OverpassWay = {
      type: 'way',
      id: source.id,
      nodes: [],
      tags: source.tags,
   }
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
}

function wayNodes(way: OverpassWay) {
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
      addNode(n!.lat, n!.lon, way.nodes[i]!)
   })

   return nodes
}

function relationNodes(
   rel: OverpassRelation,
   ways: OverpassWay[]
): OverpassNode[] {
   const nodes: OverpassNode[] = []
   const addNode = (lat: number, lon: number, id: ElementID) => {
      nodes.push({ type: 'node', id, lat, lon })
   }
   const addWay = (geometry: (OverpassNode | null)[], id: ElementID) => {
      if (ways.some((w) => w.type == 'way' && w.id == id)) return

      const way: OverpassWay = { type: 'way', id, nodes: [], tags: {} }

      geometry.forEach((n) => {
         if (n) {
            const node: OverpassNode = {
               type: 'node',
               id: `__anonymous@${n.lat}/${n.lon}`,
               lat: n.lat,
               lon: n.lon,
            }
            nodes.push(node)
            way.nodes.push(node.id)
         } else {
            way.nodes.push(undefined)
         }
      })
      ways.push(way)
   }

   rel.members.forEach((m, i) => {
      if (m.type == 'node') {
         if (m.lat !== undefined) addNode(m.lat, m.lon!, m.ref)
      } else if (m.type == 'way') {
         if (m.geometry) {
            m.ref = fullGeoPrefix + m.ref
            addWay(m.geometry, m.ref)
         }
      }
   })

   return nodes
}

const hasGeometry = (rel: OverpassRelation): boolean =>
   rel.members &&
   rel.members.some(
      (m) =>
         (m.type == 'node' && m.lat !== undefined) ||
         (m.type == 'way' && m.geometry && m.geometry.length > 0)
   )

function toGeoJSON(
   nodes: OverpassNode[],
   ways: OverpassWay[],
   rels: OverpassRelation[]
) {
   const allNodes: Map<ElementID, OverpassNode> = new Map()
   const allWays: Map<ElementID, OverpassWay> = new Map()
   const allRels: Map<ElementID, OverpassRelation> = new Map()
   const usedNodes: Set<ElementID> = new Set()
   const poi: Set<ElementID> = new Set()
   const poiNodes: OverpassNode[] = []

   nodes.forEach((n) => {
      allNodes.set(n.id, n)
      // only if node has interesting tags:
      poi.add(n.id)
   })

   rels.forEach((r) => {
      if (Array.isArray(r.members)) {
         r.members.forEach((m) => {
            if (m.type == 'node') poi.add(m.ref)
         })
      }
   })

   ways.forEach((w) => {
      allWays.set(w.id, w)
      if (Array.isArray(w.nodes)) {
         w.nodes.forEach((id, i) => {
            if (typeof id === 'object') return
            if (id !== undefined) {
               usedNodes.add(id)
               w.nodes[i] = allNodes.get(id)
            }
         })
      }
   })

   allNodes.forEach((node, id) => {
      if (!usedNodes.has(id) || poi.has(id)) poiNodes.push(node)
   })

   rels.forEach((r) => allRels.set(r.id, r))

   const reference = {
      node: {} as Record<number, ProcessMember[]>,
      way: {} as Record<number, ProcessMember[]>,
      relation: {} as Record<number, ProcessMember[]>,
   }

   allRels.forEach((rel, id) => {
      if (!Array.isArray(rel.members)) return

      rel.members.forEach((m) => {
         const refType = m.type
         let refID = m.ref

         if (typeof refID !== 'number') {
            refID = parseInt(refID.replace(fullGeoPrefix, ''), 10)
         }

         if (reference[refType] === undefined) return

         if (reference[refType]![refID] === undefined) {
            reference[refType][refID] = []
         }

         reference[refType][refID].push({
            role: m.role,
            rel: id,
            reltags: rel.tags,
         })
      })
   })
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
            const way = { ...el, nodes: [...el.nodes] } as OverpassWay
            ways.push(way)
            if (way.center) nodes.push(centerNode(way))

            if (way.geometry) {
               nodes.push(...wayNodes(way))
            } else if (way.bounds) {
               nodes.push(...boundaryNodes(way, ways))
            }
            break
         }
         case 'relation': {
            const rel = { ...el, members: [...el.members] } as OverpassRelation
            rels.push(rel)
            if (rel.center) nodes.push(centerNode(rel))

            if (hasGeometry(rel)) {
               nodes.push(...relationNodes(rel, ways))
            } else if (rel.bounds) {
               nodes.push(...boundaryNodes(rel, ways))
            }
            break
         }
         default:
            break
      }
   })

   toGeoJSON(nodes, ways, rels)
}
