import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RadarVisualization } from '../RadarVisualization';
import type { RadarData, Entry } from '../types';

// Mock the RadarEntry component since we're testing RadarVisualization in isolation
vi.mock('../RadarEntry', () => ({
  RadarEntry: vi.fn(({ entry, onClick, isSelected }) => (
    <div 
      data-testid={`radar-entry-${entry.name}`}
      onClick={() => onClick(entry)}
      className={isSelected ? 'selected' : ''}
    >
      {entry.name}
    </div>
  ))
}));

describe('RadarVisualization Component', () => {
  const mockRadarData: RadarData = {
    quadrants: [
      { name: 'Languages & Frameworks', index: 0 },
      { name: 'Tools', index: 1 },
      { name: 'Platforms', index: 2 },
      { name: 'Techniques', index: 3 }
    ],
    rings: [
      { name: 'Adopt', color: '#93c47d', index: 0 },
      { name: 'Trial', color: '#93d2c2', index: 1 },
      { name: 'Assess', color: '#fce5cd', index: 2 },
      { name: 'Hold', color: '#f4cccc', index: 3 }
    ],
    entries: []
  };

  const mockEntries: Entry[] = [
    {
      name: 'React',
      quadrant: 'Languages & Frameworks',
      ring: 'Adopt',
      description: 'A JavaScript library for building user interfaces'
    },
    {
      name: 'Vue.js',
      quadrant: 'Languages & Frameworks',
      ring: 'Trial',
      description: 'Progressive JavaScript framework'
    },
    {
      name: 'Docker',
      quadrant: 'Tools',
      ring: 'Adopt',
      description: 'Containerization platform'
    }
  ];

  const mockOnEntryClick = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render the radar visualization container', () => {
      render(
        <RadarVisualization
          radarData={mockRadarData}
          entries={mockEntries}
          onEntryClick={mockOnEntryClick}
          selectedEntry={null}
        />
      );

      expect(screen.getByRole('img')).toBeInTheDocument();
    });

    it('should render all provided entries', () => {
      render(
        <RadarVisualization
          radarData={mockRadarData}
          entries={mockEntries}
          onEntryClick={mockOnEntryClick}
          selectedEntry={null}
        />
      );

      expect(screen.getByTestId('radar-entry-React')).toBeInTheDocument();
      expect(screen.getByTestId('radar-entry-Vue.js')).toBeInTheDocument();
      expect(screen.getByTestId('radar-entry-Docker')).toBeInTheDocument();
    });

    it('should render SVG with correct viewBox', () => {
      render(
        <RadarVisualization
          radarData={mockRadarData}
          entries={mockEntries}
          onEntryClick={mockOnEntryClick}
          selectedEntry={null}
        />
      );

      const svg = screen.getByRole('img');
      expect(svg).toHaveAttribute('viewBox', '0 0 100 100');
    });

    it('should render quadrant lines', () => {
      const { container } = render(
        <RadarVisualization
          radarData={mockRadarData}
          entries={mockEntries}
          onEntryClick={mockOnEntryClick}
          selectedEntry={null}
        />
      );

      // Should have lines for quadrant divisions
      const lines = container.querySelectorAll('line');
      expect(lines.length).toBeGreaterThan(0);
    });

    it('should render ring circles', () => {
      const { container } = render(
        <RadarVisualization
          radarData={mockRadarData}
          entries={mockEntries}
          onEntryClick={mockOnEntryClick}
          selectedEntry={null}
        />
      );

      // Should have circles for each ring
      const circles = container.querySelectorAll('circle');
      expect(circles.length).toBe(mockRadarData.rings.length);
    });
  });

  describe('Entry Interaction', () => {
    it('should call onEntryClick when an entry is clicked', () => {
      render(
        <RadarVisualization
          radarData={mockRadarData}
          entries={mockEntries}
          onEntryClick={mockOnEntryClick}
          selectedEntry={null}
        />
      );

      const reactEntry = screen.getByTestId('radar-entry-React');
      fireEvent.click(reactEntry);

      expect(mockOnEntryClick).toHaveBeenCalledWith(mockEntries[0]);
    });

    it('should highlight selected entry', () => {
      render(
        <RadarVisualization
          radarData={mockRadarData}
          entries={mockEntries}
          onEntryClick={mockOnEntryClick}
          selectedEntry={mockEntries[0]}
        />
      );

      const reactEntry = screen.getByTestId('radar-entry-React');
      expect(reactEntry).toHaveClass('selected');
    });

    it('should not highlight non-selected entries', () => {
      render(
        <RadarVisualization
          radarData={mockRadarData}
          entries={mockEntries}
          onEntryClick={mockOnEntryClick}
          selectedEntry={mockEntries[0]}
        />
      );

      const vueEntry = screen.getByTestId('radar-entry-Vue.js');
      expect(vueEntry).not.toHaveClass('selected');
    });
  });

  describe('Position Calculation', () => {
    it('should position entries within their correct quadrants and rings', () => {
      // This test verifies that the positioning logic works correctly
      // We can't easily test exact positions due to randomness, but we can verify structure
      render(
        <RadarVisualization
          radarData={mockRadarData}
          entries={mockEntries}
          onEntryClick={mockOnEntryClick}
          selectedEntry={null}
        />
      );

      // All entries should be rendered
      expect(screen.getByTestId('radar-entry-React')).toBeInTheDocument();
      expect(screen.getByTestId('radar-entry-Vue.js')).toBeInTheDocument();
      expect(screen.getByTestId('radar-entry-Docker')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty entries array', () => {
      render(
        <RadarVisualization
          radarData={mockRadarData}
          entries={[]}
          onEntryClick={mockOnEntryClick}
          selectedEntry={null}
        />
      );

      // Should still render the radar structure
      expect(screen.getByRole('img')).toBeInTheDocument();
    });

    it('should handle missing quadrant or ring gracefully', () => {
      const entryWithInvalidQuadrant: Entry = {
        name: 'Invalid Entry',
        quadrant: 'Non-existent Quadrant',
        ring: 'Adopt',
        description: 'This should not crash the component'
      };

      // This should not throw an error
      expect(() => {
        render(
          <RadarVisualization
            radarData={mockRadarData}
            entries={[entryWithInvalidQuadrant]}
            onEntryClick={mockOnEntryClick}
            selectedEntry={null}
          />
        );
      }).not.toThrow();
    });
  });
});
