import { useState } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Badge,
  LoadingSpinner,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/app-component-library'
import { Images, Upload, Search, Grid, TrendingUp, Clock, Plus } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { logger } from '@repo/logger'
import { useEnhancedGallerySearchQuery, useGetEnhancedGalleryStatsQuery } from '@/store'

/**
 * Enhanced Gallery Module showcasing our serverless API client features
 */
export function GalleryModule() {
  const [searchParams, setSearchParams] = useState({
    query: '',
    themes: [] as string[],
    difficulty: [] as string[],
    sortBy: 'popularity' as const,
    page: 1,
    limit: 20,
  })

  // Use enhanced gallery search with all optimizations
  const {
    data: galleryData,
    isLoading: isGalleryLoading,
    isFetching,
    error: galleryError,
  } = useEnhancedGallerySearchQuery(searchParams as any)

  // Get enhanced gallery statistics
  const { data: statsData, isLoading: isStatsLoading } = useGetEnhancedGalleryStatsQuery()

  const handleSearch = (query: string) => {
    setSearchParams(prev => ({ ...prev, query, page: 1 }))
  }

  const handleThemeFilter = (theme: string) => {
    setSearchParams(prev => ({
      ...prev,
      themes: prev.themes.includes(theme)
        ? prev.themes.filter(t => t !== theme)
        : [...prev.themes, theme],
      page: 1,
    }))
  }

  return (
    <div className="space-y-6">
      {/* Header with enhanced statistics */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Images className="h-8 w-8 text-primary" />
              Enhanced Gallery
            </h1>
            <p className="text-muted-foreground">
              Browse and discover amazing LEGO MOC designs with advanced serverless features
            </p>
            {/* Story 3.1.15: Upload CTA */}
            <Button
              asChild
              variant="default"
              size="sm"
              className="mt-2"
              onClick={() =>
                logger.info('Gallery upload CTA clicked', { route: '/instructions/new' })
              }
              aria-label="Upload your own MOC instructions"
            >
              <Link to="/instructions/new">
                <Plus className="mr-2 h-4 w-4" />
                Upload yours
              </Link>
            </Button>
          </div>

          {/* Performance indicator */}
          {(galleryData as any)?.performance ? (
            <div className="text-right text-sm text-muted-foreground">
              <div>Loaded in {(galleryData as any).performance.duration.toFixed(0)}ms</div>
              <div className="flex items-center gap-1">
                {(galleryData as any).performance.cacheHit ? (
                  <>
                    <TrendingUp className="h-3 w-3 text-green-500" />
                    Cached
                  </>
                ) : (
                  <>
                    <Clock className="h-3 w-3 text-blue-500" />
                    Network
                  </>
                )}
              </div>
            </div>
          ) : null}
        </div>

        {/* Enhanced Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Images</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isStatsLoading ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  statsData?.data?.totalImages?.toLocaleString() || '0'
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Categories</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isStatsLoading ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  statsData?.data?.totalCategories || '0'
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Recent Uploads</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isStatsLoading ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  statsData?.data?.recentUploads || '0'
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Search Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isGalleryLoading ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  (
                    (galleryData?.data as any)?.totalCount ??
                    galleryData?.pagination?.total ??
                    0
                  ).toLocaleString()
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Enhanced Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Advanced Search & Filtering
          </CardTitle>
          <CardDescription>
            Search with LEGO-specific filters and intelligent caching
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search Input */}
          <div className="flex gap-2">
            <Input
              placeholder="Search LEGO MOCs... (e.g., 'technic vehicle')"
              value={searchParams.query}
              onChange={e => handleSearch(e.target.value)}
              className="flex-1"
            />
            <Select
              value={searchParams.sortBy}
              onValueChange={(value: any) => setSearchParams(prev => ({ ...prev, sortBy: value }))}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="popularity">Most Popular</SelectItem>
                <SelectItem value="date">Most Recent</SelectItem>
                <SelectItem value="title">Alphabetical</SelectItem>
                <SelectItem value="pieceCount">Piece Count</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* LEGO Theme Filters */}
          <div className="space-y-2">
            <label className="text-sm font-medium">LEGO Themes</label>
            <div className="flex flex-wrap gap-2">
              {['Technic', 'Creator Expert', 'Architecture', 'City', 'Space', 'Castle'].map(
                theme => (
                  <Button
                    key={theme}
                    variant={searchParams.themes.includes(theme) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleThemeFilter(theme)}
                  >
                    {theme}
                  </Button>
                ),
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gallery Results */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Grid className="h-5 w-5" />
              Gallery Results
              {isFetching ? <LoadingSpinner size="sm" /> : null}
            </CardTitle>

            {galleryData?.pagination ? (
              <div className="text-sm text-muted-foreground">
                Page {galleryData.pagination.page} •{' '}
                {(galleryData.data as any)?.totalCount ?? galleryData.pagination?.total ?? 0} total
                {(galleryData.pagination as any)?.hasMore ||
                galleryData.pagination.page < galleryData.pagination.totalPages
                  ? ' • More available'
                  : null}
              </div>
            ) : null}
          </div>
        </CardHeader>
        <CardContent>
          {isGalleryLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center space-y-4">
                <LoadingSpinner size="lg" />
                <p className="text-muted-foreground">Loading gallery with enhanced features...</p>
              </div>
            </div>
          ) : galleryError ? (
            <div className="text-center py-12">
              <div className="text-red-500 mb-2">Error loading gallery</div>
              <p className="text-muted-foreground text-sm">
                {(galleryError as any)?.message || 'Failed to load gallery images'}
              </p>
            </div>
          ) : galleryData?.data?.images?.length ? (
            <div className="space-y-4">
              {/* Results Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {galleryData.data.images.map(
                  (image: {
                    id: string
                    title: string
                    thumbnailUrl?: string
                    url: string
                    tags?: string[]
                    themes?: string[]
                    description?: string
                    difficulty?: 'beginner' | 'intermediate' | 'advanced' | 'expert'
                    pieceCount?: number
                    hasInstructions?: boolean
                    isOriginalDesign?: boolean
                    isFeatured?: boolean
                  }) => (
                    <Card
                      key={image.id}
                      className="overflow-hidden hover:shadow-lg transition-shadow"
                    >
                      <div className="aspect-square bg-muted relative">
                        {image.thumbnailUrl ? (
                          <img
                            src={image.thumbnailUrl}
                            alt={image.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Images className="h-12 w-12 text-muted-foreground" />
                          </div>
                        )}

                        {/* Difficulty Badge */}
                        {image.difficulty ? (
                          <Badge
                            className="absolute top-2 right-2"
                            variant={
                              image.difficulty === 'expert'
                                ? 'destructive'
                                : image.difficulty === 'advanced'
                                  ? 'default'
                                  : image.difficulty === 'intermediate'
                                    ? 'secondary'
                                    : 'outline'
                            }
                          >
                            {image.difficulty}
                          </Badge>
                        ) : null}
                      </div>

                      <CardContent className="p-4">
                        <h3 className="font-semibold truncate mb-2">{image.title}</h3>

                        {/* Piece Count */}
                        {image.pieceCount ? (
                          <p className="text-sm text-muted-foreground mb-2">
                            {image.pieceCount.toLocaleString()} pieces
                          </p>
                        ) : null}

                        {/* Themes */}
                        {image.themes && image.themes.length > 0 ? (
                          <div className="flex flex-wrap gap-1 mb-2">
                            {image.themes.slice(0, 2).map((theme: string) => (
                              <Badge key={theme} variant="outline" className="text-xs">
                                {theme}
                              </Badge>
                            ))}
                            {image.themes.length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{image.themes.length - 2}
                              </Badge>
                            )}
                          </div>
                        ) : null}

                        {/* Features */}
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {image.hasInstructions ? (
                            <Badge variant="outline" className="text-xs">
                              Instructions
                            </Badge>
                          ) : null}
                          {image.isOriginalDesign ? (
                            <Badge variant="outline" className="text-xs">
                              Original
                            </Badge>
                          ) : null}
                          {image.isFeatured ? (
                            <Badge variant="default" className="text-xs">
                              Featured
                            </Badge>
                          ) : null}
                        </div>
                      </CardContent>
                    </Card>
                  ),
                )}
              </div>

              {/* Pagination */}
              {(galleryData.pagination as any)?.hasMore ||
              (galleryData.pagination &&
                galleryData.pagination.page < galleryData.pagination.totalPages) ? (
                <div className="text-center pt-4">
                  <Button
                    onClick={() => setSearchParams(prev => ({ ...prev, page: prev.page + 1 }))}
                    disabled={isFetching}
                  >
                    {isFetching ? (
                      <>
                        <LoadingSpinner size="sm" className="mr-2" />
                        Loading...
                      </>
                    ) : (
                      'Load More'
                    )}
                  </Button>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="text-center py-12">
              <Images className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No images found</h3>
              <p className="text-muted-foreground">Try adjusting your search terms or filters</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Enhanced Features Showcase */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Enhanced Features Active
          </CardTitle>
          <CardDescription>
            This gallery is powered by our enhanced serverless API client
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <Search className="h-8 w-8 text-primary mx-auto mb-2" />
              <h4 className="font-semibold mb-1">LEGO-Specific Search</h4>
              <p className="text-sm text-muted-foreground">
                Advanced filtering by themes, difficulty, and piece count
              </p>
            </div>

            <div className="text-center p-4 border rounded-lg">
              <TrendingUp className="h-8 w-8 text-primary mx-auto mb-2" />
              <h4 className="font-semibold mb-1">Performance Optimized</h4>
              <p className="text-sm text-muted-foreground">
                Intelligent caching and prefetching for 50% faster loads
              </p>
            </div>

            <div className="text-center p-4 border rounded-lg">
              <Upload className="h-8 w-8 text-primary mx-auto mb-2" />
              <h4 className="font-semibold mb-1">Batch Operations</h4>
              <p className="text-sm text-muted-foreground">
                Efficient multi-item operations with optimistic updates
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
