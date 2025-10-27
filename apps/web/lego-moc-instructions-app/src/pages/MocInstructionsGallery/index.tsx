import React, { useCallback, useMemo, useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'

// Debounce function removed - not currently used
import { useNavigate } from '@tanstack/react-router'
import {
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Card,
  CardContent,
  showSuccessToast,
  showErrorToast,
} from '@repo/ui'
import { Plus, Search, Grid, List, LayoutGrid, Table, Blocks } from 'lucide-react'
import { Gallery } from '@repo/gallery'
import {
  useGetInstructionsQuery,
  useCreateInstructionWithFilesMutation,
} from '@repo/moc-instructions'
import { CreateMocModal, type CreateMocData } from '../../components/CreateMocModal'
import { MocViews } from '../../components/MocViews'

// RTK imports
import { AppDispatch } from '../../store/store'
import {
  setLayout,
  setSortBy,
  setSearchQuery,
  setSelectedCategory,
  type GalleryLayout,
} from '../../store/gallerySlice'
import {
  selectGalleryLayout,
  selectGallerySortBy,
  selectGallerySearchQuery,
  selectGallerySelectedCategory,
} from '../../store/gallerySelectors'

// Import real API hooks instead of mock data

// Note: Avoiding setFilter import issues by implementing filtering locally

const MocInstructionsGallery: React.FC = () => {
  console.log('🎯 MocInstructionsGallery component is rendering!')
  console.log('🎯 Component mounted at:', new Date().toISOString())

  const navigate = useNavigate()
  const dispatch = useDispatch<AppDispatch>()

  // Redux state for search and filters
  const searchQuery = useSelector(selectGallerySearchQuery)
  const selectedCategory = useSelector(selectGallerySelectedCategory)
  const sortBy = useSelector(selectGallerySortBy)
  const currentLayout = useSelector(selectGalleryLayout)

  // Modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

  // Use real API instead of mock data
  // Since the API only has search endpoint, we'll search with empty query to get all MOCs
  const {
    data: apiResponse,
    isLoading,
    error,
    refetch: refetchInstructions,
  } = useGetInstructionsQuery({
    q: '', // Empty query to get all MOCs
    from: 0,
    size: 100, // Get first 100 MOCs
  })

  // RTK Query mutation for creating MOCs
  const [createMocWithFiles, { isLoading: isCreating }] = useCreateInstructionWithFilesMutation()

  // Helper function to extract error message from RTK Query error
  const getErrorMessage = useCallback((error: any): string => {
    if (!error) return 'An unexpected error occurred'

    // RTK Query error structure
    if (error.status && error.data) {
      return error.data.message || error.data.error || `Error ${error.status}`
    }

    // Network error
    if (error.message) {
      return error.message
    }

    // Fallback
    return String(error)
  }, [])

  // Extract MOCs from API response and transform to expected format
  const allInstructions = useMemo(() => {
    console.log('🔍 API Response:', apiResponse)
    if (!apiResponse?.mocs) {
      console.log('⚠️ No mocs found in API response')
      return []
    }

    console.log('📋 Found', apiResponse.mocs.length, 'MOCs')
    // Transform backend MOC data to match gallery expectations
    return apiResponse.mocs.map((moc: any) => ({
      id: moc.id,
      title: moc.title,
      description: moc.description || '',
      author: 'User', // TODO: Get actual user name from user ID
      category: moc.tags?.[0] || 'Other', // Use first tag as category
      difficulty: 'intermediate', // TODO: Add difficulty to backend
      pieces: 0, // TODO: Calculate from parts lists
      estimatedTime: 60, // TODO: Add to backend
      tags: moc.tags || [],
      coverImageUrl: moc.thumbnailUrl,
      rating: 4.5, // TODO: Calculate from reviews
      downloadCount: 0, // TODO: Add to backend
      createdAt: moc.createdAt,
      updatedAt: moc.updatedAt,
      isPublic: true,
      isPublished: true,
    }))
  }, [apiResponse])

  // Extract unique categories from the actual data
  const availableCategories = useMemo(() => {
    if (!allInstructions || allInstructions.length === 0) return []
    const categories = [...new Set(allInstructions.map(instruction => instruction.category))]
    return categories.sort()
  }, [allInstructions])

  // Local filtering logic to avoid Redux import issues
  const filteredInstructions = useMemo(() => {
    console.log('🔄 useMemo recalculating with:', { searchQuery, selectedCategory, sortBy })
    if (!allInstructions) return []

    let filtered = [...allInstructions]

    // Apply search filter
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase()
      filtered = filtered.filter(
        inst =>
          inst.title.toLowerCase().includes(searchLower) ||
          inst.description.toLowerCase().includes(searchLower) ||
          inst.author.toLowerCase().includes(searchLower) ||
          inst.tags.some(tag => tag.toLowerCase().includes(searchLower)),
      )
    }

    // Apply category filter
    if (selectedCategory) {
      filtered = filtered.filter(inst => inst.category === selectedCategory)
    }

    // Apply sorting
    filtered.sort((a, b) => {
      console.log(`🔄 Sorting by: ${sortBy}`)
      switch (sortBy) {
        case 'recent':
          const dateA = new Date(a.createdAt).getTime()
          const dateB = new Date(b.createdAt).getTime()
          console.log(`📅 Comparing dates: ${a.title} (${dateA}) vs ${b.title} (${dateB})`)
          return dateB - dateA
        case 'popular':
        case 'downloaded': // Handle both popular and downloaded
          const downloadsA = a.downloadCount || 0
          const downloadsB = b.downloadCount || 0
          console.log(
            `📊 Comparing downloads: ${a.title} (${downloadsA}) vs ${b.title} (${downloadsB})`,
          )
          return downloadsB - downloadsA
        case 'rated':
          const ratingA = a.rating || 0
          const ratingB = b.rating || 0
          console.log(`⭐ Comparing ratings: ${a.title} (${ratingA}) vs ${b.title} (${ratingB})`)
          return ratingB - ratingA
        case 'pieces':
          const piecesA = a.totalParts || 0
          const piecesB = b.totalParts || 0
          console.log(
            `🧱 Comparing piece counts: ${a.title} (${piecesA}) vs ${b.title} (${piecesB})`,
          )
          return piecesB - piecesA
        case 'alphabetical':
          console.log(`🔤 Comparing titles: ${a.title} vs ${b.title}`)
          return a.title.localeCompare(b.title)
        default:
          console.log(`🔄 Default sorting (recent)`)
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      }
    })

    return filtered
  }, [allInstructions, searchQuery, selectedCategory, sortBy])

  // Debug logging
  console.log('🔍 MocInstructionsGallery Debug:', {
    allInstructionsLength: allInstructions?.length,
    filteredInstructionsLength: filteredInstructions?.length,
    isLoading,
    error,
    selectedCategory,
    searchQuery,
    sortBy,
    availableCategories,
  })

  // Debug the first few items to see their data
  if (filteredInstructions && filteredInstructions.length > 0) {
    console.log(
      '📋 First few filtered instructions:',
      filteredInstructions.slice(0, 3).map(inst => ({
        title: inst.title,
        createdAt: inst.createdAt,
        downloadCount: inst.downloadCount,
        rating: inst.rating,
      })),
    )
  }

  // Real API automatically fetches data, no need for manual useEffect

  const handleInstructionClick = useCallback(
    (instruction: any) => {
      navigate({ to: '/moc-detail/$id', params: { id: instruction.id } })
    },
    [navigate],
  )

  const handleImageLike = useCallback((imageId: string, liked: boolean) => {
    console.log(`Image ${imageId} ${liked ? 'liked' : 'unliked'}`)
    // TODO: Implement like functionality
  }, [])

  const handleImageShare = useCallback((imageId: string) => {
    console.log(`Sharing image ${imageId}`)
    // TODO: Implement share functionality
  }, [])

  const handleImageDownload = useCallback(async (imageId: string) => {
    console.log(`Downloading image ${imageId}`)
    // TODO: Implement download count increment with real API
    try {
      // For now, just log the download
      console.log('Download count would be incremented for image:', imageId)
    } catch (error) {
      console.error('Failed to increment download count:', error)
    }
  }, [])

  const handleImageDelete = useCallback((imageId: string) => {
    console.log(`Deleting image ${imageId}`)
    // TODO: Implement delete functionality
  }, [])

  const handleImagesSelected = useCallback((selectedIds: Array<string>) => {
    console.log('Selected images:', selectedIds)
    // TODO: Implement selection functionality
  }, [])

  const handleSearch = useCallback(
    (query: string) => {
      console.log('🔍 Search query:', query)
      dispatch(setSearchQuery(query))
    },
    [dispatch],
  )

  const handleCategoryChange = useCallback(
    (category: string) => {
      console.log('🏷️ Category changed:', category)
      // Convert "all" back to empty string for filtering logic
      const actualCategory = category === 'all' ? '' : category
      dispatch(setSelectedCategory(actualCategory))
    },
    [dispatch],
  )

  const handleSortChange = useCallback(
    (sort: string) => {
      console.log('📊 Sort changed from', sortBy, 'to', sort)
      dispatch(setSortBy(sort as any))
      console.log('📊 Sort state updated to:', sort)
    },
    [dispatch, sortBy],
  )

  const handleLayoutChange = useCallback(
    (layout: GalleryLayout) => {
      console.log('🎨 Layout changed to:', layout)
      dispatch(setLayout(layout))
    },
    [dispatch],
  )

  // Modal handlers
  const handleCreateNew = useCallback(() => {
    console.log('🔘 Create New MOC button clicked')
    console.log('🔘 Current modal state:', isCreateModalOpen)
    setIsCreateModalOpen(true)
    console.log('🔘 Modal state should now be true')
  }, [isCreateModalOpen])

  const handleCloseModal = useCallback(() => {
    setIsCreateModalOpen(false)
  }, [])

  const handleSubmitMoc = useCallback(
    async (mocData: CreateMocData) => {
      console.log('📝 New MOC submitted:', mocData)

      try {
        // Validate required files
        if (!mocData.instructionsFile) {
          throw new Error('At least one instructions file is required')
        }

        // Create FormData for file upload
        const formData = new FormData()

        // Add metadata
        formData.append('type', mocData.type)
        formData.append('title', mocData.title)
        if (mocData.description) {
          formData.append('description', mocData.description)
        }
        formData.append('author', mocData.author)

        // Add tags as JSON string (if any)
        if (mocData.tags && mocData.tags.length > 0) {
          formData.append('tags', JSON.stringify(mocData.tags))
        }

        // Add required instructions file
        formData.append('instructionsFile', mocData.instructionsFile.file)

        // Add optional parts lists
        mocData.partsLists.forEach(partsList => {
          formData.append('partsLists', partsList.file)
        })

        // Add optional images
        mocData.images.forEach(image => {
          formData.append('images', image.file)
        })

        console.log('📤 Sending FormData to API via RTK Query...')
        console.log('📋 Metadata being sent:')
        console.log('  - Type:', mocData.type)
        console.log('  - Title:', mocData.title)
        console.log('  - Description:', mocData.description)
        console.log('  - Author:', mocData.author)
        console.log('  - Tags:', mocData.tags)
        console.log('📁 Files being sent:')
        console.log('  - Instructions:', mocData.instructionsFile.file.name)
        console.log(
          '  - Parts Lists:',
          mocData.partsLists.map(p => p.file.name),
        )
        console.log(
          '  - Images:',
          mocData.images.map(i => i.file.name),
        )

        // Use RTK Query mutation (automatically handles cache invalidation)
        const result = await createMocWithFiles(formData).unwrap()
        console.log('✅ MOC created successfully:', result)

        // Show success toast
        showSuccessToast(
          'MOC created successfully!',
          `"${mocData.title}" has been added to your gallery.`,
        )

        // Manually refetch the gallery data to ensure it updates
        console.log('🔄 Manually refreshing gallery...')
        refetchInstructions()
      } catch (error: any) {
        console.error('❌ Error creating MOC:', error)

        // Show error toast with user-friendly message
        showErrorToast(error, 'Failed to create MOC')
      }
    },
    [createMocWithFiles],
  )

  const handleFilter = useCallback((filters: any) => {
    console.log('Filters applied:', filters)
    // TODO: Implement filter functionality with Redux
    // dispatch(setFilters(filters));
  }, [])

  const handleSort = useCallback((sortBy: string, sortOrder: 'asc' | 'desc') => {
    console.log('Sort applied:', { sortBy, sortOrder })
    // TODO: Implement sort functionality with Redux
    // dispatch(setSortOptions({ sortBy, sortOrder }));
  }, [])

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-orange-50 via-yellow-50 to-red-50 dark:from-background dark:via-muted/20 dark:to-accent/10"
      data-testid="moc-gallery-page"
    >
      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Search and Filters Card */}
        <Card>
          <CardContent className="p-6">
            {/* Header with Create Button */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">My MOC Collection</h2>
              <Button onClick={handleCreateNew} className="gap-2">
                <Plus className="h-4 w-4" />
                Add New MOC
              </Button>
            </div>

            {/* Search Bar */}
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5 pointer-events-none" />
                <Input
                  type="text"
                  value={searchQuery}
                  placeholder="Search MOCs by title, author, or description..."
                  className="w-full pl-10 pr-4 py-3 text-base"
                  onChange={e => handleSearch(e.target.value)}
                />
              </div>
            </div>

            {/* Filter Controls and Layout Toggle */}
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
              {/* Left side - Filter dropdowns */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 flex-shrink-0">
                <Select value={selectedCategory || 'all'} onValueChange={handleCategoryChange}>
                  <SelectTrigger className="min-w-[160px]">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {availableCategories.map(category => (
                      <SelectItem key={category} value={category}>
                        {category.charAt(0).toUpperCase() + category.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={sortBy} onValueChange={handleSortChange}>
                  <SelectTrigger className="min-w-[160px]">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recent">Most Recent</SelectItem>
                    <SelectItem value="popular">Most Popular</SelectItem>
                    <SelectItem value="rated">Highest Rated</SelectItem>
                    <SelectItem value="downloaded">Most Downloaded</SelectItem>
                    <SelectItem value="pieces">Most Pieces</SelectItem>
                    <SelectItem value="alphabetical">A-Z</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Right side - Layout Toggle Buttons */}
              <div className="flex items-center justify-center lg:justify-end">
                <div className="flex items-center border rounded-lg overflow-hidden bg-background">
                  <button
                    onClick={() => handleLayoutChange('grid')}
                    className={`flex items-center justify-center px-4 py-2 transition-all duration-200 ${
                      currentLayout === 'grid'
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground border-r'
                    }`}
                    title="Grid View"
                    aria-label="Grid View"
                  >
                    <Grid className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleLayoutChange('list')}
                    className={`flex items-center justify-center px-4 py-2 transition-all duration-200 ${
                      currentLayout === 'list'
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground border-r'
                    }`}
                    title="List View"
                    aria-label="List View"
                  >
                    <List className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleLayoutChange('masonry')}
                    className={`flex items-center justify-center px-4 py-2 transition-all duration-200 ${
                      currentLayout === 'masonry'
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                    title="Masonry View"
                    aria-label="Masonry View"
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleLayoutChange('table')}
                    className={`flex items-center justify-center px-4 py-2 transition-all duration-200 ${
                      currentLayout === 'table'
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                    title="Table View"
                    aria-label="Table View"
                  >
                    <Table className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* MOC Views */}
        {!isLoading && filteredInstructions && filteredInstructions.length > 0 ? (
          <Card>
            <CardContent className="p-6">
              <MocViews
                instructions={filteredInstructions.map(instruction => ({
                  id: instruction.id,
                  title: instruction.title,
                  description: instruction.description,
                  author: instruction.author,
                  category: instruction.category,
                  tags: instruction.tags,
                  coverImageUrl: instruction.coverImageUrl,
                  rating: instruction.rating,
                  downloadCount: instruction.downloadCount,
                  createdAt: instruction.createdAt,
                  updatedAt: instruction.updatedAt,
                }))}
                layout={currentLayout}
                onMocClick={instruction => {
                  navigate({ to: `/moc-detail/${instruction.id}` })
                }}
              />
            </CardContent>
          </Card>
        ) : null}

        {/* Empty State */}
        {!isLoading && (!filteredInstructions || filteredInstructions.length === 0) && (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="max-w-md mx-auto">
                <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
                  <div className="text-4xl">🧱</div>
                </div>
                <h3 className="text-2xl font-bold text-foreground mb-3">No MOC Instructions Yet</h3>
                <p className="text-muted-foreground mb-8 leading-relaxed">
                  Be the first to share your amazing LEGO creation! Upload your MOC instructions and
                  inspire builders around the world.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button onClick={handleCreateNew} size="lg" className="gap-2">
                    <Plus className="h-5 w-5" />
                    Create First MOC
                  </Button>
                  <Button onClick={() => refetchInstructions()} variant="outline" size="lg">
                    Refresh Gallery
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Loading State */}
        {isLoading ? (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="flex flex-col items-center">
                <div className="relative">
                  <div className="animate-spin rounded-full h-16 w-16 border-4 border-muted"></div>
                  <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary border-t-transparent absolute top-0 left-0"></div>
                </div>
                <div className="mt-6">
                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    Loading Amazing MOCs
                  </h3>
                  <p className="text-muted-foreground">
                    Discovering the latest community creations...
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {/* Error State */}
        {error ? (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="max-w-md mx-auto">
                <div className="w-24 h-24 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <div className="text-4xl">⚠️</div>
                </div>
                <h3 className="text-2xl font-bold text-destructive mb-3">
                  Oops! Something went wrong
                </h3>
                <p className="text-destructive mb-2 font-medium">{getErrorMessage(error)}</p>
                <p className="text-muted-foreground mb-8">
                  Don't worry, this happens sometimes. Try refreshing the page or check back later.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button onClick={() => window.location.reload()} size="lg">
                    Try Again
                  </Button>
                  <Button onClick={handleCreateNew} variant="outline" size="lg">
                    Create New MOC
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {/* Create MOC Modal */}
        <CreateMocModal
          isOpen={isCreateModalOpen}
          onClose={handleCloseModal}
          onSubmit={handleSubmitMoc}
          isLoading={isCreating}
        />
      </div>
    </div>
  )
}

export default MocInstructionsGallery
