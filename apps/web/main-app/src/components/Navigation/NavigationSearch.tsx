import React, { useState, useRef, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Search, Clock, Star, ArrowRight, Command } from 'lucide-react'
import { Input, Button, Badge, Card, CardContent, cn } from '@repo/app-component-library'
import { useNavigation } from './NavigationProvider'
import {
  setSearchQuery,
  clearSearchResults,
  selectNavigationSearch,
  selectUserPreferences,
  NavigationItem,
} from '@/store/slices/navigationSlice'

interface NavigationSearchProps {
  className?: string
  placeholder?: string
  showShortcut?: boolean
}

/**
 * Enhanced Navigation Search Component
 * Provides intelligent search across all navigation items with recent searches and favorites
 */
export function NavigationSearch({
  className,
  placeholder = 'Search navigation...',
  showShortcut = true,
}: NavigationSearchProps) {
  const dispatch = useDispatch()
  const { searchNavigation, navigateToItem, trackNavigation } = useNavigation()
  const search = useSelector(selectNavigationSearch)
  const userPreferences = useSelector(selectUserPreferences)

  const [isOpen, setIsOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)

  // Handle search input changes
  const handleSearchChange = (value: string) => {
    dispatch(setSearchQuery(value))
    setSelectedIndex(0)
    setIsOpen(value.length > 0 || search.recentSearches.length > 0)
  }

  // Handle search submission
  const handleSearchSubmit = (query?: string) => {
    const searchQuery = query || search.query
    if (searchQuery.trim()) {
      searchNavigation(searchQuery)

      // If there are results, navigate to the first one
      if (search.results.length > 0) {
        navigateToItem(search.results[0])
      }

      handleClose()
    }
  }

  // Handle result selection
  const handleResultSelect = (item: NavigationItem) => {
    navigateToItem(item)
    trackNavigation(item.id, { source: 'search_result' })
    handleClose()
  }

  // Handle recent search selection
  const handleRecentSearchSelect = (query: string) => {
    dispatch(setSearchQuery(query))
    handleSearchSubmit(query)
  }

  // Close search
  const handleClose = () => {
    setIsOpen(false)
    dispatch(clearSearchResults())
    inputRef.current?.blur()
  }

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return

    const totalItems = search.results.length + search.recentSearches.length

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev => (prev + 1) % totalItems)
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => (prev - 1 + totalItems) % totalItems)
        break
      case 'Enter':
        e.preventDefault()
        if (search.results.length > 0 && selectedIndex < search.results.length) {
          handleResultSelect(search.results[selectedIndex])
        } else if (search.recentSearches.length > 0) {
          const recentIndex = selectedIndex - search.results.length
          if (recentIndex >= 0 && recentIndex < search.recentSearches.length) {
            handleRecentSearchSelect(search.recentSearches[recentIndex])
          }
        } else {
          handleSearchSubmit()
        }
        break
      case 'Escape':
        handleClose()
        break
    }
  }

  // Global keyboard shortcut (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
        setIsOpen(true)
      }
    }

    document.addEventListener('keydown', handleGlobalKeyDown)
    return () => document.removeEventListener('keydown', handleGlobalKeyDown)
  }, [])

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (resultsRef.current && !resultsRef.current.contains(event.target as Node)) {
        handleClose()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const showResults = isOpen && (search.results.length > 0 || search.recentSearches.length > 0)

  return (
    <div className={cn('relative', className)} ref={resultsRef}>
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={search.query}
          onChange={e => handleSearchChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsOpen(true)}
          className="pl-10 pr-20"
        />
        {showShortcut ? (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
            <Badge variant="outline" className="text-xs">
              <Command className="h-3 w-3 mr-1" />K
            </Badge>
          </div>
        ) : null}
      </div>

      {/* Search Results */}
      {showResults ? (
        <Card className="absolute top-full left-0 right-0 mt-2 z-50 max-h-96 overflow-y-auto">
          <CardContent className="p-0">
            {/* Navigation Results */}
            {search.results.length > 0 && (
              <div className="p-2">
                <div className="text-xs font-medium text-muted-foreground mb-2 px-2">
                  Navigation
                </div>
                {search.results.map((item, index) => (
                  <Button
                    key={item.id}
                    variant="ghost"
                    className={cn(
                      'w-full justify-start h-auto p-2 mb-1',
                      selectedIndex === index && 'bg-accent',
                    )}
                    onClick={() => handleResultSelect(item)}
                  >
                    <div className="flex items-center gap-3 w-full">
                      {item.icon ? (
                        <div className="flex-shrink-0">
                          {/* Icon would be rendered here */}
                          <div className="w-4 h-4 bg-muted rounded" />
                        </div>
                      ) : null}
                      <div className="flex-1 text-left">
                        <div className="font-medium">{item.label}</div>
                        {item.description ? (
                          <div className="text-xs text-muted-foreground">{item.description}</div>
                        ) : null}
                      </div>
                      {userPreferences.favoriteItems.includes(item.id) && (
                        <Star className="h-3 w-3 text-yellow-500" />
                      )}
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    </div>
                  </Button>
                ))}
              </div>
            )}

            {/* Recent Searches */}
            {search.recentSearches.length > 0 && (
              <div className="p-2 border-t">
                <div className="text-xs font-medium text-muted-foreground mb-2 px-2">
                  Recent Searches
                </div>
                {search.recentSearches.map((query, index) => {
                  const resultIndex = search.results.length + index
                  return (
                    <Button
                      key={query}
                      variant="ghost"
                      className={cn(
                        'w-full justify-start h-auto p-2 mb-1',
                        selectedIndex === resultIndex && 'bg-accent',
                      )}
                      onClick={() => handleRecentSearchSelect(query)}
                    >
                      <div className="flex items-center gap-3 w-full">
                        <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span className="flex-1 text-left">{query}</span>
                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                      </div>
                    </Button>
                  )
                })}
              </div>
            )}

            {/* No Results */}
            {search.query && search.results.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">
                <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <div className="text-sm">No navigation items found</div>
                <div className="text-xs">Try a different search term</div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
