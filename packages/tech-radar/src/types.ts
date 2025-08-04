export interface Entry {
  name: string
  quadrant: string
  ring: string
  description: string
  moved?: 'in' | 'out' | 'none'
}

export interface Quadrant {
  name: string
  index: number
}

export interface Ring {
  name: string
  color: string
  index: number
}

export interface RadarData {
  quadrants: Quadrant[]
  rings: Ring[]
  entries: Entry[]
}

export interface RadarEntryProps {
  entry: Entry
  quadrant: Quadrant
  ring: Ring
  onClick: (entry: Entry) => void
  isSelected: boolean
} 