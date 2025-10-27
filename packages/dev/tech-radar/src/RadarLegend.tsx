import React from 'react'
import { Quadrant, Ring } from './types'

interface RadarLegendProps {
  quadrants: Quadrant[]
  rings: Ring[]
}

export const RadarLegend: React.FC<RadarLegendProps> = ({ quadrants, rings }) => {
  return (
    <div className="radar-legend">
      <div className="legend-section">
        <h3 className="legend-title">Rings</h3>
        <div className="legend-items">
          {rings.map(ring => (
            <div key={ring.name} className="legend-item">
              <div className="legend-color" style={{ backgroundColor: ring.color }} />
              <div className="legend-content">
                <span className="legend-name">{ring.name}</span>
                <span className="legend-description">
                  {ring.name === 'Adopt' &&
                    'Technologies we have high confidence in to serve our purpose'}
                  {ring.name === 'Trial' &&
                    'Technologies worth pursuing with the goal of understanding how it will affect your architecture'}
                  {ring.name === 'Assess' &&
                    'Technologies that are promising and have clear potential value-add for us'}
                  {ring.name === 'Hold' &&
                    'Technologies not recommended to be used for new projects'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="legend-section">
        <h3 className="legend-title">Quadrants</h3>
        <div className="legend-items">
          {quadrants.map(quadrant => (
            <div key={quadrant.name} className="legend-item">
              <div className="legend-content">
                <span className="legend-name">{quadrant.name}</span>
                <span className="legend-description">
                  {quadrant.name === 'Techniques' && 'Processes, practices, and ways of working'}
                  {quadrant.name === 'Tools' && 'Software that helps you do your job'}
                  {quadrant.name === 'Platforms' &&
                    'Infrastructure and platforms that applications are built on'}
                  {quadrant.name === 'Languages & Frameworks' &&
                    'Programming languages and frameworks'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
