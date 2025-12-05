import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { GalleryTagFilter } from '../components/GalleryTagFilter'
import { GalleryThemeFilter } from '../components/GalleryThemeFilter'
import { GalleryActiveFilters, ActiveFilter } from '../components/GalleryActiveFilters'
import { GalleryFilterBar, SortOption } from '../components/GalleryFilterBar'

describe('GalleryTagFilter', () => {
  const tags = ['Star Wars', 'City', 'Space', 'Castle']

  it('renders with available tags', () => {
    render(<GalleryTagFilter tags={tags} selected={[]} onChange={() => {}} />)

    expect(screen.getByTestId('gallery-tag-filter')).toBeInTheDocument()
  })

  it('displays placeholder when no tags selected', () => {
    render(<GalleryTagFilter tags={tags} selected={[]} onChange={() => {}} />)

    expect(screen.getByText('Filter by tags')).toBeInTheDocument()
  })

  it('displays custom placeholder', () => {
    render(
      <GalleryTagFilter
        tags={tags}
        selected={[]}
        onChange={() => {}}
        placeholder="Select tags..."
      />,
    )

    expect(screen.getByText('Select tags...')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    render(
      <GalleryTagFilter
        tags={tags}
        selected={[]}
        onChange={() => {}}
        className="custom-class"
      />,
    )

    expect(screen.getByTestId('gallery-tag-filter')).toHaveClass('custom-class')
  })

  it('renders with custom data-testid', () => {
    render(
      <GalleryTagFilter
        tags={tags}
        selected={[]}
        onChange={() => {}}
        data-testid="custom-tag-filter"
      />,
    )

    expect(screen.getByTestId('custom-tag-filter')).toBeInTheDocument()
  })
})

describe('GalleryThemeFilter', () => {
  const themes = ['Star Wars', 'City', 'Space', 'Castle']

  it('renders with available themes', () => {
    render(<GalleryThemeFilter themes={themes} selected={null} onChange={() => {}} />)

    expect(screen.getByTestId('gallery-theme-filter')).toBeInTheDocument()
  })

  it('displays "All Themes" by default', () => {
    render(<GalleryThemeFilter themes={themes} selected={null} onChange={() => {}} />)

    expect(screen.getByText('All Themes')).toBeInTheDocument()
  })

  it('displays custom placeholder', () => {
    render(
      <GalleryThemeFilter
        themes={themes}
        selected={null}
        onChange={() => {}}
        placeholder="Any Theme"
      />,
    )

    expect(screen.getByText('Any Theme')).toBeInTheDocument()
  })

  it('displays selected theme', () => {
    render(<GalleryThemeFilter themes={themes} selected="Space" onChange={() => {}} />)

    expect(screen.getByText('Space')).toBeInTheDocument()
  })

  it('renders label when provided', () => {
    render(
      <GalleryThemeFilter
        themes={themes}
        selected={null}
        onChange={() => {}}
        label="Filter by theme"
      />,
    )

    expect(screen.getByText('Filter by theme')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    render(
      <GalleryThemeFilter
        themes={themes}
        selected={null}
        onChange={() => {}}
        className="custom-class"
      />,
    )

    expect(screen.getByTestId('gallery-theme-filter')).toHaveClass('custom-class')
  })
})

describe('GalleryActiveFilters', () => {
  const filters: ActiveFilter[] = [
    { key: 'tag', value: 'star-wars', label: 'Star Wars' },
    { key: 'tag', value: 'space', label: 'Space' },
    { key: 'theme', value: 'city', label: 'Theme: City' },
  ]

  it('renders active filters as badges', () => {
    render(
      <GalleryActiveFilters filters={filters} onRemove={() => {}} onClearAll={() => {}} />,
    )

    expect(screen.getByText('Star Wars')).toBeInTheDocument()
    expect(screen.getByText('Space')).toBeInTheDocument()
    expect(screen.getByText('Theme: City')).toBeInTheDocument()
  })

  it('renders Clear All button', () => {
    render(
      <GalleryActiveFilters filters={filters} onRemove={() => {}} onClearAll={() => {}} />,
    )

    expect(screen.getByTestId('gallery-active-filters-clear-all')).toBeInTheDocument()
    expect(screen.getByText('Clear all')).toBeInTheDocument()
  })

  it('calls onRemove when filter badge remove button clicked', () => {
    const handleRemove = vi.fn()
    render(
      <GalleryActiveFilters filters={filters} onRemove={handleRemove} onClearAll={() => {}} />,
    )

    fireEvent.click(screen.getByTestId('gallery-active-filters-remove-tag-star-wars'))

    expect(handleRemove).toHaveBeenCalledWith('tag', 'star-wars')
  })

  it('calls onClearAll when Clear All clicked', () => {
    const handleClearAll = vi.fn()
    render(
      <GalleryActiveFilters filters={filters} onRemove={() => {}} onClearAll={handleClearAll} />,
    )

    fireEvent.click(screen.getByTestId('gallery-active-filters-clear-all'))

    expect(handleClearAll).toHaveBeenCalledTimes(1)
  })

  it('renders nothing when filters array is empty', () => {
    const { container } = render(
      <GalleryActiveFilters filters={[]} onRemove={() => {}} onClearAll={() => {}} />,
    )

    expect(container.firstChild).toBeNull()
  })

  it('has accessible aria-label', () => {
    render(
      <GalleryActiveFilters filters={filters} onRemove={() => {}} onClearAll={() => {}} />,
    )

    expect(screen.getByRole('region')).toHaveAttribute('aria-label', 'Active filters')
  })

  it('renders remove button with accessible label', () => {
    render(
      <GalleryActiveFilters filters={filters} onRemove={() => {}} onClearAll={() => {}} />,
    )

    expect(screen.getByTestId('gallery-active-filters-remove-tag-star-wars')).toHaveAttribute(
      'aria-label',
      'Remove Star Wars filter',
    )
  })
})

describe('GalleryFilterBar', () => {
  const tags = ['Star Wars', 'City', 'Space']
  const themes = ['Adventure', 'Sci-Fi', 'Fantasy']
  const sortOptions: SortOption[] = [
    { value: 'name-asc', label: 'Name A-Z' },
    { value: 'name-desc', label: 'Name Z-A' },
    { value: 'date-desc', label: 'Newest First' },
  ]

  it('renders filter bar container', () => {
    render(<GalleryFilterBar />)

    expect(screen.getByTestId('gallery-filter-bar')).toBeInTheDocument()
  })

  it('renders search when onSearchChange provided', () => {
    render(<GalleryFilterBar search="" onSearchChange={() => {}} />)

    expect(screen.getByTestId('gallery-filter-bar-search')).toBeInTheDocument()
  })

  it('renders tag filter when tags and onTagsChange provided', () => {
    render(
      <GalleryFilterBar
        tags={tags}
        selectedTags={[]}
        onTagsChange={() => {}}
      />,
    )

    expect(screen.getByTestId('gallery-filter-bar-tags')).toBeInTheDocument()
  })

  it('renders theme filter when themes and onThemeChange provided', () => {
    render(
      <GalleryFilterBar
        themes={themes}
        selectedTheme={null}
        onThemeChange={() => {}}
      />,
    )

    expect(screen.getByTestId('gallery-filter-bar-theme')).toBeInTheDocument()
  })

  it('renders sort select when sortOptions and onSortChange provided', () => {
    render(
      <GalleryFilterBar
        sortOptions={sortOptions}
        selectedSort=""
        onSortChange={() => {}}
      />,
    )

    // Sort select should be present
    expect(screen.getByText('Sort by')).toBeInTheDocument()
  })

  it('shows active filters when tags are selected', () => {
    render(
      <GalleryFilterBar
        tags={tags}
        selectedTags={['Star Wars', 'Space']}
        onTagsChange={() => {}}
        showActiveFilters
      />,
    )

    expect(screen.getByTestId('gallery-filter-bar-active-filters')).toBeInTheDocument()
    // Use testid to find specific active filter badges (not the MultiSelect pills)
    expect(screen.getByTestId('gallery-filter-bar-active-filters-badge-tag-Star Wars')).toBeInTheDocument()
    expect(screen.getByTestId('gallery-filter-bar-active-filters-badge-tag-Space')).toBeInTheDocument()
  })

  it('shows active filters when theme is selected', () => {
    render(
      <GalleryFilterBar
        themes={themes}
        selectedTheme="Sci-Fi"
        onThemeChange={() => {}}
        showActiveFilters
      />,
    )

    expect(screen.getByText('Theme: Sci-Fi')).toBeInTheDocument()
  })

  it('hides active filters when showActiveFilters is false', () => {
    render(
      <GalleryFilterBar
        tags={tags}
        selectedTags={['Star Wars']}
        onTagsChange={() => {}}
        showActiveFilters={false}
      />,
    )

    expect(screen.queryByTestId('gallery-filter-bar-active-filters')).not.toBeInTheDocument()
  })

  it('calls onTagsChange when tag filter is removed from active filters', () => {
    const handleTagsChange = vi.fn()
    render(
      <GalleryFilterBar
        tags={tags}
        selectedTags={['Star Wars', 'Space']}
        onTagsChange={handleTagsChange}
        showActiveFilters
      />,
    )

    fireEvent.click(screen.getByTestId('gallery-filter-bar-active-filters-remove-tag-Star Wars'))

    expect(handleTagsChange).toHaveBeenCalledWith(['Space'])
  })

  it('calls onThemeChange(null) when theme filter is removed from active filters', () => {
    const handleThemeChange = vi.fn()
    render(
      <GalleryFilterBar
        themes={themes}
        selectedTheme="Sci-Fi"
        onThemeChange={handleThemeChange}
        showActiveFilters
      />,
    )

    fireEvent.click(screen.getByTestId('gallery-filter-bar-active-filters-remove-theme-Sci-Fi'))

    expect(handleThemeChange).toHaveBeenCalledWith(null)
  })

  it('calls onClearAll when provided and clear all clicked', () => {
    const handleClearAll = vi.fn()
    render(
      <GalleryFilterBar
        tags={tags}
        selectedTags={['Star Wars']}
        onTagsChange={() => {}}
        onClearAll={handleClearAll}
        showActiveFilters
      />,
    )

    fireEvent.click(screen.getByTestId('gallery-filter-bar-active-filters-clear-all'))

    expect(handleClearAll).toHaveBeenCalledTimes(1)
  })

  it('clears all filters when clear all clicked and no onClearAll provided', () => {
    const handleTagsChange = vi.fn()
    const handleThemeChange = vi.fn()
    const handleSearchChange = vi.fn()

    render(
      <GalleryFilterBar
        search="test"
        onSearchChange={handleSearchChange}
        tags={tags}
        selectedTags={['Star Wars']}
        onTagsChange={handleTagsChange}
        themes={themes}
        selectedTheme="Sci-Fi"
        onThemeChange={handleThemeChange}
        showActiveFilters
      />,
    )

    fireEvent.click(screen.getByTestId('gallery-filter-bar-active-filters-clear-all'))

    expect(handleTagsChange).toHaveBeenCalledWith([])
    expect(handleThemeChange).toHaveBeenCalledWith(null)
    expect(handleSearchChange).toHaveBeenCalledWith('')
  })

  it('applies custom className', () => {
    render(<GalleryFilterBar className="custom-class" />)

    expect(screen.getByTestId('gallery-filter-bar')).toHaveClass('custom-class')
  })
})
