import React from 'react'
import { Quadrant, Ring } from './types'
import { Search, Filter, X } from 'lucide-react'

interface RadarFiltersProps {
  quadrants: Quadrant[]
  rings: Ring[]
  filters: {
    quadrants: string[]
    rings: string[]
    search: string
  }
  onFiltersChange: (filters: {
    quadrants: string[]
    rings: string[]
    search: string
  }) => void
}

export const RadarFilters: React.FC<RadarFiltersProps> = ({
  quadrants,
  rings,
  filters,
  onFiltersChange
}) => {
  const handleQuadrantToggle = (quadrantName: string) => {
    const newQuadrants = filters.quadrants.includes(quadrantName)
      ? filters.quadrants.filter(q => q !== quadrantName)
      : [...filters.quadrants, quadrantName]
    
    onFiltersChange({
      ...filters,
      quadrants: newQuadrants
    })
  }

  const handleRingToggle = (ringName: string) => {
    const newRings = filters.rings.includes(ringName)
      ? filters.rings.filter(r => r !== ringName)
      : [...filters.rings, ringName]
    
    onFiltersChange({
      ...filters,
      rings: newRings
    })
  }

  const handleSearchChange = (search: string) => {
    onFiltersChange({
      ...filters,
      search
    })
  }

  const clearAllFilters = () => {
    onFiltersChange({
      quadrants: [],
      rings: [],
      search: ''
    })
  }

  const hasActiveFilters = filters.quadrants.length > 0 || filters.rings.length > 0 || filters.search

  return (
    <div className="radar-filters">
      <div className="filters-header">
        <h3 className="filters-title">
          <Filter size={16} />
          Filters
        </h3>
        {hasActiveFilters && (
          <button
            onClick={clearAllFilters}
            className="clear-filters-btn"
            title="Clear all filters"
          >
            <X size={14} />
          </button>
        )}
      </div>

      <div className="filter-group">
        <label className="filter-label">Search</label>
        <div className="search-input-wrapper">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder="Search technologies..."
            value={filters.search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="search-input"
          />
        </div>
      </div>

      <div className="filter-group">
        <label className="filter-label">Quadrants</label>
        <div className="filter-options">
          {quadrants.map((quadrant) => (
            <label key={quadrant.name} className="filter-option">
              <input
                type="checkbox"
                checked={filters.quadrants.includes(quadrant.name)}
                onChange={() => handleQuadrantToggle(quadrant.name)}
                className="filter-checkbox"
              />
              <span className="filter-option-text">{quadrant.name}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="filter-group">
        <label className="filter-label">Rings</label>
        <div className="filter-options">
          {rings.map((ring) => (
            <label key={ring.name} className="filter-option">
              <input
                type="checkbox"
                checked={filters.rings.includes(ring.name)}
                onChange={() => handleRingToggle(ring.name)}
                className="filter-checkbox"
              />
              <div 
                className="filter-color-indicator"
                style={{ backgroundColor: ring.color }}
              />
              <span className="filter-option-text">{ring.name}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  )
} 