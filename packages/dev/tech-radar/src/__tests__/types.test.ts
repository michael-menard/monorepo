import { describe, it, expect, vi } from 'vitest'
import type { Entry, Quadrant, Ring, RadarData, RadarEntryProps } from '../types'

describe('Tech Radar Types', () => {
  describe('Entry Interface', () => {
    it('should define required properties', () => {
      const entry: Entry = {
        name: 'React',
        quadrant: 'Languages & Frameworks',
        ring: 'Adopt',
        description: 'A JavaScript library for building user interfaces',
      }

      expect(entry.name).toBe('React')
      expect(entry.quadrant).toBe('Languages & Frameworks')
      expect(entry.ring).toBe('Adopt')
      expect(entry.description).toBe('A JavaScript library for building user interfaces')
    })

    it('should support optional moved property', () => {
      const entryWithMoved: Entry = {
        name: 'Angular',
        quadrant: 'Languages & Frameworks',
        ring: 'Trial',
        description: 'A platform for building mobile and desktop web applications',
        moved: 'in',
      }

      expect(entryWithMoved.moved).toBe('in')
    })

    it('should accept valid moved values', () => {
      const validMoved: Array<Entry['moved']> = ['in', 'out', 'none', undefined]

      validMoved.forEach(moved => {
        const entry: Entry = {
          name: 'Test',
          quadrant: 'Test',
          ring: 'Test',
          description: 'Test',
          moved,
        }
        expect([undefined, 'in', 'out', 'none']).toContain(entry.moved)
      })
    })
  })

  describe('Quadrant Interface', () => {
    it('should define required properties', () => {
      const quadrant: Quadrant = {
        name: 'Languages & Frameworks',
        index: 0,
      }

      expect(quadrant.name).toBe('Languages & Frameworks')
      expect(quadrant.index).toBe(0)
      expect(typeof quadrant.index).toBe('number')
    })
  })

  describe('Ring Interface', () => {
    it('should define required properties', () => {
      const ring: Ring = {
        name: 'Adopt',
        color: '#93c47d',
        index: 0,
      }

      expect(ring.name).toBe('Adopt')
      expect(ring.color).toBe('#93c47d')
      expect(ring.index).toBe(0)
      expect(typeof ring.index).toBe('number')
    })
  })

  describe('RadarData Interface', () => {
    it('should define required arrays', () => {
      const radarData: RadarData = {
        quadrants: [
          { name: 'Languages & Frameworks', index: 0 },
          { name: 'Tools', index: 1 },
        ],
        rings: [
          { name: 'Adopt', color: '#93c47d', index: 0 },
          { name: 'Trial', color: '#93d2c2', index: 1 },
        ],
        entries: [
          {
            name: 'React',
            quadrant: 'Languages & Frameworks',
            ring: 'Adopt',
            description: 'A JavaScript library for building user interfaces',
          },
        ],
      }

      expect(Array.isArray(radarData.quadrants)).toBe(true)
      expect(Array.isArray(radarData.rings)).toBe(true)
      expect(Array.isArray(radarData.entries)).toBe(true)
      expect(radarData.quadrants).toHaveLength(2)
      expect(radarData.rings).toHaveLength(2)
      expect(radarData.entries).toHaveLength(1)
    })
  })

  describe('RadarEntryProps Interface', () => {
    it('should define required properties for component props', () => {
      const mockOnClick = vi.fn()
      const entry: Entry = {
        name: 'React',
        quadrant: 'Languages & Frameworks',
        ring: 'Adopt',
        description: 'A JavaScript library',
      }
      const quadrant: Quadrant = { name: 'Languages & Frameworks', index: 0 }
      const ring: Ring = { name: 'Adopt', color: '#93c47d', index: 0 }

      const props: RadarEntryProps = {
        entry,
        quadrant,
        ring,
        onClick: mockOnClick,
        isSelected: false,
      }

      expect(props.entry).toBe(entry)
      expect(props.quadrant).toBe(quadrant)
      expect(props.ring).toBe(ring)
      expect(typeof props.onClick).toBe('function')
      expect(typeof props.isSelected).toBe('boolean')
    })
  })
})
