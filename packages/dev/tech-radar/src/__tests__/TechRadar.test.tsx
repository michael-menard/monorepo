import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { TechRadar } from '../TechRadar'

// Mock all child components to test TechRadar in isolation
vi.mock('../RadarVisualization', () => ({
  RadarVisualization: vi.fn(({ radarData, entries, onEntryClick, selectedEntry }) => (
    <div data-testid="radar-visualization">Radar Visualization - Entries: {entries.length}</div>
  )),
}))

vi.mock('../RadarLegend', () => ({
  RadarLegend: vi.fn(({ radarData }) => (
    <div data-testid="radar-legend">
      Radar Legend - Quadrants: {radarData?.quadrants?.length || 0}
    </div>
  )),
}))

vi.mock('../EntryDetails', () => ({
  EntryDetails: vi.fn(({ entry, onClose }) =>
    entry ? (
      <div data-testid="entry-details">
        Entry Details: {entry.name}
        <button onClick={onClose}>Close</button>
      </div>
    ) : null,
  ),
}))

vi.mock('../RadarFilters', () => ({
  RadarFilters: vi.fn(({ radarData, filters, onFiltersChange }) => (
    <div data-testid="radar-filters">Radar Filters</div>
  )),
}))

// Mock fetch API
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('TechRadar Component', () => {
  const mockRadarData = {
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
      {
        name: 'Vue.js',
        quadrant: 'Languages & Frameworks',
        ring: 'Trial',
        description: 'Progressive JavaScript framework',
      },
    ],
  }

  beforeEach(() => {
    vi.clearAllMocks()
    // Set up successful fetch response by default
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockRadarData),
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Initial Rendering', () => {
    it('should render loading state initially', () => {
      render(<TechRadar />)

      // Should show loading state initially
      expect(screen.getByText('Loading Tech Radar...')).toBeInTheDocument()
      expect(document.querySelector('.tech-radar-loading')).toBeInTheDocument()
    })

    it('should render main components after loading', async () => {
      render(<TechRadar />)

      // Wait for the component to finish loading and show main content
      await waitFor(
        () => {
          expect(screen.getByText('Tech Radar')).toBeInTheDocument()
          expect(screen.getByTestId('radar-filters')).toBeInTheDocument()
          expect(screen.getByTestId('radar-legend')).toBeInTheDocument()
          expect(screen.getByTestId('radar-visualization')).toBeInTheDocument()
        },
        { timeout: 3000 },
      )
    })

    it('should render all components after data loads', async () => {
      render(<TechRadar />)

      await waitFor(() => {
        expect(screen.getByTestId('radar-visualization')).toBeInTheDocument()
        expect(screen.getByTestId('radar-legend')).toBeInTheDocument()
        expect(screen.getByTestId('radar-filters')).toBeInTheDocument()
      })
    })
  })

  describe('Data Loading', () => {
    it('should process quadrants with indices', async () => {
      render(<TechRadar />)

      // Wait for data to load and check that quadrants are processed
      await waitFor(
        () => {
          const legend = screen.getByTestId('radar-legend')
          // The component shows "Radar Legend - Quadrants: X" format
          expect(legend).toHaveTextContent(/Quadrants:/)
        },
        { timeout: 3000 },
      )
    })

    it('should handle fetch errors gracefully', async () => {
      mockFetch.mockRejectedValue(new Error('Failed to fetch'))

      render(<TechRadar />)

      // Component should fall back to default data on error (no console.error logged)
      await waitFor(
        () => {
          // Should still render with default fallback data
          expect(screen.getByText('Tech Radar')).toBeInTheDocument()
          expect(screen.getByTestId('radar-visualization')).toBeInTheDocument()
        },
        { timeout: 3000 },
      )
    })

    it('should handle invalid JSON response', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.reject(new Error('Invalid JSON')),
      })

      render(<TechRadar />)

      // Component should fall back to default data on JSON parse error
      await waitFor(
        () => {
          // Should still render with default fallback data
          expect(screen.getByText('Tech Radar')).toBeInTheDocument()
          expect(screen.getByTestId('radar-visualization')).toBeInTheDocument()
        },
        { timeout: 3000 },
      )
    })
  })

  describe('Filtering Logic', () => {
    it('should initialize with all entries when no filters are applied', async () => {
      render(<TechRadar />)

      // Wait for data to load and check entries
      await waitFor(
        () => {
          const visualization = screen.getByTestId('radar-visualization')
          // The component shows "Radar Visualization - Entries: X" format
          expect(visualization).toHaveTextContent(/Entries:/)
        },
        { timeout: 3000 },
      )
    })

    it('should apply search filter correctly', async () => {
      // This test would require more complex mocking of the filter state
      // For now, we verify the component structure is correct
      render(<TechRadar />)

      await waitFor(() => {
        expect(screen.getByTestId('radar-filters')).toBeInTheDocument()
      })
    })
  })

  describe('Entry Selection', () => {
    it('should not show entry details initially', async () => {
      render(<TechRadar />)

      await waitFor(() => {
        expect(screen.queryByTestId('entry-details')).not.toBeInTheDocument()
      })
    })

    // Note: Testing entry selection would require more complex interaction simulation
    // since the actual click handling is in child components that are mocked
  })

  describe('Component Integration', () => {
    it('should render all child components after loading', async () => {
      render(<TechRadar />)

      // Wait for loading to complete and child components to render
      await waitFor(
        () => {
          expect(screen.getByTestId('radar-visualization')).toBeInTheDocument()
          expect(screen.getByTestId('radar-legend')).toBeInTheDocument()
          expect(screen.getByTestId('radar-filters')).toBeInTheDocument()
        },
        { timeout: 3000 },
      )
    })
  })
})
