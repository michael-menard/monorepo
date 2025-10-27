import React from 'react'
import { X, ArrowUp, ArrowDown, Minus } from 'lucide-react'
import { Entry } from './types'

interface EntryDetailsProps {
  entry: Entry
  onClose: () => void
}

export const EntryDetails: React.FC<EntryDetailsProps> = ({ entry, onClose }) => {
  const getMovementIcon = () => {
    switch (entry.moved) {
      case 'in':
        return <ArrowUp size={16} className="movement-icon in" />
      case 'out':
        return <ArrowDown size={16} className="movement-icon out" />
      default:
        return <Minus size={16} className="movement-icon none" />
    }
  }

  const getMovementText = () => {
    switch (entry.moved) {
      case 'in':
        return 'Moved in'
      case 'out':
        return 'Moved out'
      default:
        return 'No movement'
    }
  }

  return (
    <div className="entry-details-overlay" onClick={onClose}>
      <div className="entry-details-modal" onClick={e => e.stopPropagation()}>
        <div className="entry-details-header">
          <div className="entry-details-title">
            <h2>{entry.name}</h2>
            <div className="entry-details-meta">
              <span className="entry-quadrant">{entry.quadrant}</span>
              <span className="entry-ring">{entry.ring}</span>
              {entry.moved ? (
                <div className="entry-movement">
                  {getMovementIcon()}
                  <span>{getMovementText()}</span>
                </div>
              ) : null}
            </div>
          </div>
          <button onClick={onClose} className="close-btn" title="Close">
            <X size={20} />
          </button>
        </div>

        <div className="entry-details-content">
          <div className="entry-description">
            <h3>Description</h3>
            <p>{entry.description}</p>
          </div>

          <div className="entry-recommendations">
            <h3>Recommendations</h3>
            {entry.ring === 'Adopt' && (
              <div className="recommendation adopt">
                <strong>Adopt:</strong> This technology is recommended for new projects. The team
                has high confidence in its ability to serve our purpose.
              </div>
            )}
            {entry.ring === 'Trial' && (
              <div className="recommendation trial">
                <strong>Trial:</strong> This technology is worth pursuing with the goal of
                understanding how it will affect your architecture.
              </div>
            )}
            {entry.ring === 'Assess' && (
              <div className="recommendation assess">
                <strong>Assess:</strong> This technology is promising and has clear potential
                value-add for us. Worth investigating further.
              </div>
            )}
            {entry.ring === 'Hold' && (
              <div className="recommendation hold">
                <strong>Hold:</strong> This technology is not recommended to be used for new
                projects. Consider alternatives.
              </div>
            )}
          </div>

          {entry.moved ? (
            <div className="entry-movement-details">
              <h3>Movement</h3>
              <div className="movement-explanation">
                {entry.moved === 'in' && (
                  <p>
                    This technology has moved closer to the center, indicating increased confidence
                    and adoption.
                  </p>
                )}
                {entry.moved === 'out' && (
                  <p>
                    This technology has moved further from the center, indicating decreased
                    confidence or being phased out.
                  </p>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
