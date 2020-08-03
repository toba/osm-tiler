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

declare interface ProcessElement extends OverpassElement {
   center?: OverpassNode // added
   bounds?: Bounds // added
   tags: Record<string, string>
}

declare interface OverpassNode extends OverpassElement {
   type: 'node'
   lat: number
   lon: number
   tags?: Record<string, string>
   __isCenterPlaceholder?: boolean // added
}

declare interface OverpassWay extends ProcessElement {
   type: 'way'
   nodes: (ElementID | undefined)[]
   geometry?: (OverpassNode | null)[] // added
   __isBoundsPlaceholder?: boolean // added
}

declare interface OverpassRelation extends ProcessElement {
   type: 'relation'
   nodes: number[] // added
   members: OverpassMember[]
}

declare interface OverpassMember {
   type: ElementType
   ref: ElementID
   role: string
   lat?: number // added
   lon?: number // added
   geometry?: (OverpassNode | null)[] // added
}

declare interface Bounds {
   minlat: number
   minlon: number
   maxlat: number
   maxlon: number
}
