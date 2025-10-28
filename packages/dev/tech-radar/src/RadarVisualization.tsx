import React, { useMemo } from 'react'
import { RadarData, Entry } from './types'
import { RadarEntry } from './RadarEntry'

interface RadarVisualizationProps {
  radarData: RadarData
  entries: Entry[]
  onEntryClick: (entry: Entry) => void
  selectedEntry: Entry | null
}

export const RadarVisualization: React.FC<RadarVisualizationProps> = ({
  radarData,
  entries,
  onEntryClick,
  selectedEntry,
}) => {
  const { quadrants, rings } = radarData

  // Calculate positions for entries
  const positionedEntries = useMemo(() => {
    return entries.map(entry => {
      const quadrant = quadrants.find(q => q.name === entry.quadrant)
      const ring = rings.find(r => r.name === entry.ring)

      // Handle missing quadrant or ring gracefully
      if (!quadrant || !ring) {
        return {
          entry,
          quadrant: quadrant || { name: entry.quadrant, index: 0 },
          ring: ring || { name: entry.ring, index: 0, color: '#gray' },
          x: 50, // Center position as fallback
          y: 50,
        }
      }

      // Calculate position within the quadrant
      const quadrantAngle = (quadrant.index * Math.PI) / 2
      const ringRadius = 0.2 + ring.index * 0.2 // 0.2 to 0.8

      // Add some randomness to prevent overlap
      const randomAngle = (Math.random() - 0.5) * 0.3
      const angle = quadrantAngle + randomAngle

      const x = 50 + Math.cos(angle) * ringRadius * 40
      const y = 50 + Math.sin(angle) * ringRadius * 40

      return {
        entry,
        quadrant,
        ring,
        x,
        y,
      }
    })
  }, [entries, quadrants, rings])

  return (
    <div className="radar-visualization">
      <svg
        viewBox="0 0 100 100"
        className="radar-svg"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Technology radar visualization showing quadrants and rings"
      >
        {/* Background grid */}
        <defs>
          <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
            <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#e5e7eb" strokeWidth="0.1" />
          </pattern>
        </defs>

        <rect width="100" height="100" fill="url(#grid)" />

        {/* Quadrant lines */}
        <line x1="50" y1="0" x2="50" y2="100" stroke="#d1d5db" strokeWidth="0.2" />
        <line x1="0" y1="50" x2="100" y2="50" stroke="#d1d5db" strokeWidth="0.2" />

        {/* Rings */}
        {rings.map((ring, index) => {
          const radius = 0.2 + index * 0.2
          const cx = 50
          const cy = 50
          const r = radius * 40

          return (
            <circle
              key={ring.name}
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke={ring.color}
              strokeWidth="0.3"
              opacity="0.3"
            />
          )
        })}

        {/* Quadrant labels */}
        {quadrants.map((quadrant, index) => {
          const angle = (index * Math.PI) / 2
          const x = 50 + Math.cos(angle) * 45
          const y = 50 + Math.sin(angle) * 45

          return (
            <text
              key={quadrant.name}
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="quadrant-label"
              fontSize="2"
              fill="#6b7280"
              fontWeight="500"
            >
              {quadrant.name}
            </text>
          )
        })}

        {/* Entries */}
        {positionedEntries.map(({ entry, quadrant, ring, x, y }) => (
          <RadarEntry
            key={entry.name}
            entry={entry}
            quadrant={quadrant}
            ring={ring}
            x={x}
            y={y}
            onClick={() => onEntryClick(entry)}
            isSelected={selectedEntry?.name === entry.name}
          />
        ))}
      </svg>
    </div>
  )
}
