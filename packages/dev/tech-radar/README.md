# @repo/tech-radar

A technology radar visualization package for tracking and displaying technology trends, tools, and frameworks across different quadrants and adoption stages.

## Features

- 📊 **Radar Visualization**: Interactive radar chart for technology mapping
- 🎯 **Quadrant Organization**: Organize technologies by quadrants (Tools, Languages, Platforms, Techniques)
- 📈 **Adoption Stages**: Track technologies across adoption stages (Hold, Assess, Trial, Adopt)
- 🔍 **Filtering & Search**: Advanced filtering and search capabilities
- 📱 **Responsive Design**: Mobile-first responsive layout
- 🎨 **Customizable UI**: Flexible styling with Tailwind CSS
- 🔧 **TypeScript**: Full type safety and IntelliSense support
- 🧪 **Testing**: Comprehensive test coverage with Vitest

## Installation

This package is part of the monorepo and should be installed as a dependency in your app:

```bash
pnpm add @repo/tech-radar
```

## Quick Start

### 1. Basic Tech Radar

```tsx
import { TechRadar } from '@repo/tech-radar';

function MyTechRadar() {
  const radarData = [
    {
      id: '1',
      name: 'React',
      quadrant: 'languages-frameworks',
      ring: 'adopt',
      description: 'JavaScript library for building user interfaces',
      url: 'https://reactjs.org',
      moved: 'up'
    },
    {
      id: '2',
      name: 'TypeScript',
      quadrant: 'languages-frameworks',
      ring: 'adopt',
      description: 'Typed superset of JavaScript',
      url: 'https://typescriptlang.org',
      moved: 'none'
    },
    // ... more entries
  ];

  return (
    <TechRadar
      data={radarData}
      onEntryClick={(entry) => console.log('Clicked:', entry)}
      onEntryHover={(entry) => console.log('Hovered:', entry)}
    />
  );
}
```

### 2. With Filters and Search

```tsx
import { TechRadar, TechRadarFilters } from '@repo/tech-radar';

function FilteredTechRadar() {
  const [filters, setFilters] = useState({
    quadrant: '',
    ring: '',
    searchTerm: ''
  });

  const filteredData = useMemo(() => {
    return radarData.filter(entry => {
      if (filters.quadrant && entry.quadrant !== filters.quadrant) return false;
      if (filters.ring && entry.ring !== filters.ring) return false;
      if (filters.searchTerm && !entry.name.toLowerCase().includes(filters.searchTerm.toLowerCase())) return false;
      return true;
    });
  }, [radarData, filters]);

  return (
    <div>
      <TechRadarFilters
        filters={filters}
        onFiltersChange={setFilters}
        quadrants={['tools', 'languages-frameworks', 'platforms', 'techniques']}
        rings={['hold', 'assess', 'trial', 'adopt']}
      />
      
      <TechRadar
        data={filteredData}
        onEntryClick={handleEntryClick}
        showLegend={true}
        showFilters={true}
      />
    </div>
  );
}
```

### 3. With Custom Configuration

```tsx
import { TechRadar, TechRadarConfig } from '@repo/tech-radar';

function CustomTechRadar() {
  const config: TechRadarConfig = {
    width: 800,
    height: 600,
    colors: {
      adopt: '#4ade80',
      trial: '#fbbf24',
      assess: '#f97316',
      hold: '#ef4444'
    },
    quadrants: {
      'tools': { label: 'Tools', color: '#3b82f6' },
      'languages-frameworks': { label: 'Languages & Frameworks', color: '#8b5cf6' },
      'platforms': { label: 'Platforms', color: '#06b6d4' },
      'techniques': { label: 'Techniques', color: '#10b981' }
    },
    showTooltips: true,
    showLegend: true,
    showFilters: true
  };

  return (
    <TechRadar
      data={radarData}
      config={config}
      onEntryClick={handleEntryClick}
      onEntryHover={handleEntryHover}
    />
  );
}
```

## API Reference

### TechRadar Component

The main radar visualization component.

```tsx
interface TechRadarProps {
  data: RadarEntry[];
  config?: TechRadarConfig;
  onEntryClick?: (entry: RadarEntry) => void;
  onEntryHover?: (entry: RadarEntry) => void;
  showLegend?: boolean;
  showFilters?: boolean;
  className?: string;
}
```

#### Props

| Property | Type | Description |
|----------|------|-------------|
| `data` | `RadarEntry[]` | Array of radar entries |
| `config` | `TechRadarConfig` | Radar configuration |
| `onEntryClick` | `(entry: RadarEntry) => void` | Entry click handler |
| `onEntryHover` | `(entry: RadarEntry) => void` | Entry hover handler |
| `showLegend` | `boolean` | Show legend |
| `showFilters` | `boolean` | Show filters |
| `className` | `string` | Additional CSS classes |

### TechRadarFilters Component

Component for filtering radar entries.

```tsx
interface TechRadarFiltersProps {
  filters: RadarFilters;
  onFiltersChange: (filters: RadarFilters) => void;
  quadrants: string[];
  rings: string[];
  className?: string;
}
```

#### Props

| Property | Type | Description |
|----------|------|-------------|
| `filters` | `RadarFilters` | Current filter state |
| `onFiltersChange` | `(filters: RadarFilters) => void` | Filter change handler |
| `quadrants` | `string[]` | Available quadrants |
| `rings` | `string[]` | Available rings |
| `className` | `string` | Additional CSS classes |

### useTechRadar Hook

Hook for managing tech radar state and interactions.

```tsx
const {
  filteredData,
  selectedEntry,
  setSelectedEntry,
  filters,
  setFilters,
  searchTerm,
  setSearchTerm
} = useTechRadar(data, initialFilters);
```

#### Return Values

| Property | Type | Description |
|----------|------|-------------|
| `filteredData` | `RadarEntry[]` | Filtered radar entries |
| `selectedEntry` | `RadarEntry \| null` | Currently selected entry |
| `setSelectedEntry` | `(entry: RadarEntry \| null) => void` | Set selected entry |
| `filters` | `RadarFilters` | Current filters |
| `setFilters` | `(filters: RadarFilters) => void` | Update filters |
| `searchTerm` | `string` | Current search term |
| `setSearchTerm` | `(term: string) => void` | Update search term |

## Types

### RadarEntry

```tsx
interface RadarEntry {
  id: string;
  name: string;
  quadrant: string;
  ring: 'hold' | 'assess' | 'trial' | 'adopt';
  description: string;
  url?: string;
  moved?: 'up' | 'down' | 'none';
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}
```

### TechRadarConfig

```tsx
interface TechRadarConfig {
  width?: number;
  height?: number;
  colors?: {
    adopt: string;
    trial: string;
    assess: string;
    hold: string;
  };
  quadrants?: Record<string, {
    label: string;
    color: string;
  }>;
  showTooltips?: boolean;
  showLegend?: boolean;
  showFilters?: boolean;
  animation?: boolean;
}
```

### RadarFilters

```tsx
interface RadarFilters {
  quadrant: string;
  ring: string;
  searchTerm: string;
  tags: string[];
  moved?: 'up' | 'down' | 'none';
}
```

## Quadrants and Rings

### Default Quadrants

- **Tools**: Development tools, build tools, testing frameworks
- **Languages & Frameworks**: Programming languages, frameworks, libraries
- **Platforms**: Cloud platforms, hosting services, infrastructure
- **Techniques**: Development practices, methodologies, patterns

### Adoption Rings

- **Adopt**: Technologies that are proven and ready for production use
- **Trial**: Technologies worth exploring with the goal of understanding how they will affect your organization
- **Assess**: Technologies that are promising and have clear potential value-add for the organization
- **Hold**: Technologies that are not recommended for new projects

## Data Management

### Adding Entries

```tsx
const handleAddEntry = async (entry: Omit<RadarEntry, 'id' | 'createdAt' | 'updatedAt'>) => {
  try {
    const response = await fetch('/api/tech-radar', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(entry)
    });

    if (!response.ok) {
      throw new Error('Failed to add entry');
    }

    const newEntry = await response.json();
    setRadarData(prev => [...prev, newEntry]);
  } catch (error) {
    console.error('Failed to add entry:', error);
    throw error;
  }
};
```

### Updating Entries

```tsx
const handleUpdateEntry = async (entryId: string, updates: Partial<RadarEntry>) => {
  try {
    const response = await fetch(`/api/tech-radar/${entryId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(updates)
    });

    if (!response.ok) {
      throw new Error('Failed to update entry');
    }

    const updatedEntry = await response.json();
    setRadarData(prev => prev.map(entry => 
      entry.id === entryId ? updatedEntry : entry
    ));
  } catch (error) {
    console.error('Failed to update entry:', error);
    throw error;
  }
};
```

## Styling

The components use Tailwind CSS for styling. You can customize the appearance by:

1. **Overriding CSS classes**: Pass custom `className` props
2. **CSS Variables**: Override CSS custom properties
3. **Tailwind Config**: Extend the Tailwind configuration

### Custom Styling Example

```tsx
<TechRadar
  data={radarData}
  className="custom-tech-radar bg-gray-50 rounded-lg p-6"
  config={{
    colors: {
      adopt: '#10b981',
      trial: '#f59e0b',
      assess: '#f97316',
      hold: '#ef4444'
    }
  }}
/>
```

## Testing

Run tests for this package:

```bash
pnpm test
```

### Test Coverage

- Radar visualization rendering
- Entry filtering and search
- Interactive features (click, hover)
- Data management operations
- Configuration handling

## Accessibility

The components include full accessibility support:

- **Keyboard navigation**: Tab, Enter, Escape keys
- **Screen reader support**: ARIA labels and descriptions
- **Focus management**: Proper focus trapping and restoration
- **High contrast**: Compatible with high contrast themes

## Contributing

1. Follow the monorepo's coding standards
2. Write tests for new features
3. Update documentation for API changes
4. Ensure TypeScript types are accurate
5. Test accessibility features

## Related Packages

- `@repo/ui` - Base UI components
- `@repo/shared` - Shared utilities
- `@repo/features/shared` - Feature-specific utilities 