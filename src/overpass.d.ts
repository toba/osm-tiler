declare interface OverpassResponse {
   version: string
   generator: string
   elements: (OverpassNode | OverpassWay | OverpassRelation)[]
}

declare type ElementType = 'node' | 'way' | 'relation'
declare type ElementID = number | string

declare interface OverpassElement {
   type: ElementType
   id: ElementID
}

declare interface OverpassNode extends OverpassElement {
   type: 'node'
   lat: number
   lon: number
   tags?: Record<string, string>
   __isCenterPlaceholder?: boolean
}

declare interface OverpassWay extends OverpassElement {
   type: 'way'
   nodes: ElementID[]
   tags: Record<string, string>
   geometry?: (OverpassNode | null)[]
   center?: OverpassNode
   bounds?: Bounds
   __isBoundsPlaceholder?: boolean
}

declare interface OverpassRelation extends OverpassElement {
   type: 'relation'
   nodes: number[]
   tags: Record<string, string>
   members: OverpassMember[]
}

declare interface OverpassMember {
   type: ElementType
   ref: ElementID
   role: string
}

declare interface Bounds {
   minlat: number
   minlon: number
   maxlat: number
   maxlon: number
}
