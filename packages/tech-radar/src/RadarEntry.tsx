import React from 'react'
import { Entry, Quadrant, Ring } from './types'

interface RadarEntryProps {
  entry: Entry
  quadrant: Quadrant
  ring: Ring
  x: number
  y: number
  onClick: () => void
  isSelected: boolean
}

export const RadarEntry: React.FC<RadarEntryProps> = ({
  entry,
  quadrant,
  ring,
  x,
  y,
  onClick,
  isSelected
}) => {
  const radius = 1.2
  const strokeWidth = 0.1

  return (
    <g className="radar-entry" onClick={onClick}>
      {/* Background circle */}
      <circle
        cx={x}
        cy={y}
        r={radius}
        fill="white"
        stroke={ring.color}
        strokeWidth={strokeWidth}
        className="radar-entry-bg"
      />
      
      {/* Inner circle with ring color */}
      <circle
        cx={x}
        cy={y}
        r={radius - strokeWidth}
        fill={ring.color}
        opacity="0.8"
        className="radar-entry-fill"
      />
      
      {/* Selection indicator */}
      {isSelected && (
        <circle
          cx={x}
          cy={y}
          r={radius + 0.5}
          fill="none"
          stroke="#3b82f6"
          strokeWidth="0.2"
          className="radar-entry-selected"
        />
      )}
      
      {/* Entry name */}
      <text
        x={x}
        y={y + radius + 2}
        textAnchor="middle"
        dominantBaseline="middle"
        className="radar-entry-label"
        fontSize="1.2"
        fill="#374151"
        fontWeight="500"
      >
        {entry.name}
      </text>
      
      {/* Movement indicator */}
      {entry.moved && entry.moved !== 'none' && (
        <g transform={`translate(${x}, ${y})`}>
          {entry.moved === 'in' && (
            <path
              d="M -0.5 -1 L 0.5 0 L -0.5 1"
              fill="none"
              stroke="#10b981"
              strokeWidth="0.2"
              className="radar-entry-moved-in"
            />
          )}
          {entry.moved === 'out' && (
            <path
              d="M -0.5 -1 L 0.5 0 L -0.5 1"
              fill="none"
              stroke="#ef4444"
              strokeWidth="0.2"
              className="radar-entry-moved-out"
              transform="rotate(180)"
            />
          )}
        </g>
      )}
    </g>
  )
} 