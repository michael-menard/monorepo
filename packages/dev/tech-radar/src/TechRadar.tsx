import React, { useState, useEffect } from 'react'
import { RadarData, Entry } from './types'
import { RadarVisualization } from './RadarVisualization'
import { RadarLegend } from './RadarLegend'
import { EntryDetails } from './EntryDetails'
import { RadarFilters } from './RadarFilters'

export const TechRadar: React.FC = () => {
  const [radarData, setRadarData] = useState<RadarData | null>(null)
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null)
  const [filteredEntries, setFilteredEntries] = useState<Entry[]>([])
  const [filters, setFilters] = useState({
    quadrants: [] as string[],
    rings: [] as string[],
    search: '',
  })

  useEffect(() => {
    const loadRadarData = async () => {
      try {
        const response = await fetch('/radar.json')
        const data = await response.json()

        // Validate data structure
        if (!data || !data.quadrants || !data.rings || !data.entries) {
          throw new Error('Invalid radar data structure')
        }

        // Add indices to quadrants and rings
        const quadrants = data.quadrants.map((q: any, index: number) => ({
          ...q,
          index,
        }))

        const rings = data.rings.map((r: any, index: number) => ({
          ...r,
          index,
        }))

        setRadarData({ ...data, quadrants, rings })
        setFilteredEntries(data.entries)
      } catch (error) {
        console.error('Failed to load radar data:', error)
        // Fallback to default data
        const defaultData: RadarData = {
          quadrants: [
            { name: 'Techniques', index: 0 },
            { name: 'Tools', index: 1 },
            { name: 'Platforms', index: 2 },
            { name: 'Languages & Frameworks', index: 3 },
          ],
          rings: [
            { name: 'Adopt', color: '#93c47d', index: 0 },
            { name: 'Trial', color: '#93d2c2', index: 1 },
            { name: 'Assess', color: '#fbdb84', index: 2 },
            { name: 'Hold', color: '#efafa9', index: 3 },
          ],
          entries: [],
        }
        setRadarData(defaultData)
        setFilteredEntries([])
      }
    }

    loadRadarData()
  }, [])

  useEffect(() => {
    if (!radarData) return

    let filtered = radarData.entries

    // Filter by quadrants
    if (filters.quadrants.length > 0) {
      filtered = filtered.filter(entry => filters.quadrants.includes(entry.quadrant))
    }

    // Filter by rings
    if (filters.rings.length > 0) {
      filtered = filtered.filter(entry => filters.rings.includes(entry.ring))
    }

    // Filter by search
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      filtered = filtered.filter(
        entry =>
          entry.name.toLowerCase().includes(searchLower) ||
          entry.description.toLowerCase().includes(searchLower),
      )
    }

    setFilteredEntries(filtered)
  }, [radarData, filters])

  const handleEntryClick = (entry: Entry) => {
    setSelectedEntry(entry)
  }

  const handleCloseDetails = () => {
    setSelectedEntry(null)
  }

  if (!radarData) {
    return (
      <div className="tech-radar-loading">
        <div className="loading-spinner"></div>
        <p>Loading Tech Radar...</p>
      </div>
    )
  }

  return (
    <div className="tech-radar">
      <header className="tech-radar-header">
        <h1>Tech Radar</h1>
        <p>Technology choices and recommendations for our monorepo</p>
      </header>

      <div className="tech-radar-content">
        <aside className="tech-radar-sidebar">
          <RadarLegend quadrants={radarData.quadrants} rings={radarData.rings} />
          <RadarFilters
            quadrants={radarData.quadrants}
            rings={radarData.rings}
            filters={filters}
            onFiltersChange={setFilters}
          />
        </aside>

        <main className="tech-radar-main">
          <RadarVisualization
            radarData={radarData}
            entries={filteredEntries}
            onEntryClick={handleEntryClick}
            selectedEntry={selectedEntry}
          />
        </main>
      </div>

      {selectedEntry ? <EntryDetails entry={selectedEntry} onClose={handleCloseDetails} /> : null}
    </div>
  )
}
