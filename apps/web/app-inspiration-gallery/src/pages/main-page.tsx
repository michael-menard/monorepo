/**
 * Inspiration Gallery Main Page
 *
 * The primary page component for the Inspiration Gallery module.
 * Displays a grid of inspirations and albums with filtering and sorting.
 *
 * INSP-001: Gallery Scaffolding
 */

import { useState, useCallback, useMemo, useRef } from 'react'
import { z } from 'zod'
import {
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  cn,
} from '@repo/app-component-library'
import { Plus, Search, Grid3X3, LayoutList, FolderPlus, CheckSquare } from 'lucide-react'
import { toast } from 'sonner'
import {
  useGetInspirationsQuery,
  useGetAlbumsQuery,
  useCreateInspirationMutation,
  useCreateAlbumMutation,
  useUpdateInspirationMutation,
  useDeleteInspirationMutation,
  useDeleteAlbumMutation,
  useGetInspirationImagePresignUrlMutation,
  type Inspiration,
  type AlbumWithMetadata,
} from '@repo/api-client/rtk/inspiration-api'
import { useMultiSelect } from '@repo/hooks/useMultiSelect'
import { useGalleryKeyboard } from '@repo/gallery'
import { logger } from '@repo/logger'
import { InspirationCard } from '../components/InspirationCard'
import { AlbumCard } from '../components/AlbumCard'
import { EmptyState } from '../components/EmptyState'
import { UploadModal } from '../components/UploadModal'
import { DraggableInspirationGallery } from '../components/DraggableInspirationGallery'
import {
  DeleteInspirationModal,
  type DeleteInspirationItem,
} from '../components/DeleteInspirationModal'
import { DeleteAlbumModal, type DeleteAlbumItem } from '../components/DeleteAlbumModal'
import { EditInspirationModal } from '../components/EditInspirationModal'
import { InspirationContextMenu } from '../components/InspirationContextMenu'
import { AlbumContextMenu } from '../components/AlbumContextMenu'
import { AddToAlbumModal } from '../components/AddToAlbumModal'
import { LinkToMocModal } from '../components/LinkToMocModal'
import { CreateAlbumModal } from '../components/CreateAlbumModal'
import { GalleryLoadingSkeleton } from '../components/GalleryLoadingSkeleton'
import { BulkActionsBar } from '../components/BulkActionsBar'

/**
 * Main page props schema
 */
const MainPagePropsSchema = z.object({
  /** Optional className for styling */
  className: z.string().optional(),
})

export type MainPageProps = z.infer<typeof MainPagePropsSchema>

type ViewMode = 'grid' | 'list'
type ActiveTab = 'all' | 'albums'
type SortOption = 'sortOrder' | 'createdAt' | 'title'

/**
 * Main Page Component
 *
 * This is the primary content page for the Inspiration Gallery module.
 * Features:
 * - Tab navigation between All and Albums views
 * - Search and filter functionality
 * - Grid/List view toggle
 * - Upload modal for adding new inspirations
 */
export function MainPage({ className }: MainPageProps) {
  // View state
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [activeTab, setActiveTab] = useState<ActiveTab>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<SortOption>('sortOrder')

  // Modal states
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const [isCreateAlbumModalOpen, setIsCreateAlbumModalOpen] = useState(false)
  const [isDeleteInspirationModalOpen, setIsDeleteInspirationModalOpen] = useState(false)
  const [isDeleteAlbumModalOpen, setIsDeleteAlbumModalOpen] = useState(false)
  const [isEditInspirationModalOpen, setIsEditInspirationModalOpen] = useState(false)
  const [isAddToAlbumModalOpen, setIsAddToAlbumModalOpen] = useState(false)
  const [isLinkToMocModalOpen, setIsLinkToMocModalOpen] = useState(false)

  // Selected items for modals
  const [selectedInspiration, setSelectedInspiration] = useState<Inspiration | null>(null)
  const [selectedAlbum, setSelectedAlbum] = useState<AlbumWithMetadata | null>(null)

  // Deletion state
  const [isDeletingInspiration, setIsDeletingInspiration] = useState(false)
  const [isDeletingAlbum, setIsDeletingAlbum] = useState(false)

  // Container ref for keyboard shortcuts
  const galleryContainerRef = useRef<HTMLDivElement>(null)

  // API queries
  const {
    data: inspirationsData,
    isLoading: isLoadingInspirations,
    error: inspirationsError,
  } = useGetInspirationsQuery({
    q: searchQuery || undefined,
    sort: sortBy,
    order: sortBy === 'title' ? 'asc' : 'desc',
    limit: 50,
  })

  const {
    data: albumsData,
    isLoading: isLoadingAlbums,
    error: albumsError,
  } = useGetAlbumsQuery({
    q: searchQuery || undefined,
    sort: sortBy,
    order: sortBy === 'title' ? 'asc' : 'desc',
    rootOnly: true,
    limit: 50,
  })

  // Mutations
  const [createInspiration] = useCreateInspirationMutation()
  const [createAlbum] = useCreateAlbumMutation()
  const [updateInspiration] = useUpdateInspirationMutation()
  const [deleteInspiration] = useDeleteInspirationMutation()
  const [deleteAlbum] = useDeleteAlbumMutation()
  const [getPresignUrl] = useGetInspirationImagePresignUrlMutation()

  // Derived data
  const inspirations = useMemo(() => inspirationsData?.items ?? [], [inspirationsData])
  const albums = useMemo(() => albumsData?.items ?? [], [albumsData])
  const inspirationIds = useMemo(() => inspirations.map(i => i.id), [inspirations])
  const albumIds = useMemo(() => albums.map(a => a.id), [albums])

  // Multi-select for inspirations
  const inspirationMultiSelect = useMultiSelect(inspirationIds, {
    onSelectionChange: ids => {
      // Exit multi-select mode when selection is cleared
      if (ids.length === 0) {
        inspirationMultiSelect.exitMultiSelectMode()
      }
    },
  })

  // Multi-select for albums
  const albumMultiSelect = useMultiSelect(albumIds, {
    onSelectionChange: ids => {
      if (ids.length === 0) {
        albumMultiSelect.exitMultiSelectMode()
      }
    },
  })

  // Current multi-select based on active tab
  const currentMultiSelect = activeTab === 'all' ? inspirationMultiSelect : albumMultiSelect

  // Handlers
  const handleUpload = useCallback(
    async (data: {
      file?: File
      url?: string
      title: string
      description?: string
      sourceUrl?: string
      tags: string[]
    }) => {
      try {
        let imageUrl: string

        if (data.file) {
          // Get presigned URL
          const presignResult = await getPresignUrl({
            fileName: data.file.name,
            mimeType: data.file.type,
            fileSize: data.file.size,
          }).unwrap()

          // Upload file to S3
          const uploadResponse = await fetch(presignResult.presignedUrl, {
            method: 'PUT',
            body: data.file,
            headers: {
              'Content-Type': data.file.type,
            },
          })

          if (!uploadResponse.ok) {
            throw new Error('Failed to upload image')
          }

          // Construct the final URL from the key
          // The API returns a CDN URL, so we use that pattern
          imageUrl = presignResult.presignedUrl.split('?')[0]
        } else if (data.url) {
          imageUrl = data.url
        } else {
          throw new Error('No image provided')
        }

        // Create the inspiration record
        await createInspiration({
          title: data.title,
          description: data.description,
          imageUrl,
          sourceUrl: data.sourceUrl,
          tags: data.tags,
        }).unwrap()

        toast.success('Inspiration added successfully!')
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to add inspiration'
        toast.error(message)
        throw error
      }
    },
    [createInspiration, getPresignUrl],
  )

  // Create album handler
  const handleCreateAlbum = useCallback(
    async (data: { title: string; description?: string; parentAlbumId?: string }) => {
      try {
        await createAlbum({
          title: data.title,
          description: data.description,
          parentAlbumId: data.parentAlbumId,
          tags: [],
        }).unwrap()

        toast.success('Album created successfully!')
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to create album'
        toast.error(message)
        throw error
      }
    },
    [createAlbum],
  )

  // Edit inspiration handler
  const handleEditInspiration = useCallback(
    async (data: {
      id: string
      title: string
      description?: string
      sourceUrl?: string
      tags: string[]
    }) => {
      try {
        await updateInspiration({
          id: data.id,
          data: {
            title: data.title,
            description: data.description,
            sourceUrl: data.sourceUrl,
            tags: data.tags,
          },
        }).unwrap()

        toast.success('Inspiration updated!')
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to update inspiration'
        toast.error(message)
        throw error
      }
    },
    [updateInspiration],
  )

  // Delete inspiration handler
  const handleDeleteInspiration = useCallback(
    async (item: DeleteInspirationItem) => {
      setIsDeletingInspiration(true)
      try {
        await deleteInspiration(item.id).unwrap()
        toast.success('Inspiration deleted')
        setIsDeleteInspirationModalOpen(false)
        setSelectedInspiration(null)
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to delete inspiration'
        toast.error(message)
      } finally {
        setIsDeletingInspiration(false)
      }
    },
    [deleteInspiration],
  )

  // Delete album handler
  const handleDeleteAlbum = useCallback(
    async (item: DeleteAlbumItem) => {
      setIsDeletingAlbum(true)
      try {
        await deleteAlbum(item.id).unwrap()
        toast.success('Album deleted')
        setIsDeleteAlbumModalOpen(false)
        setSelectedAlbum(null)
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to delete album'
        toast.error(message)
      } finally {
        setIsDeletingAlbum(false)
      }
    },
    [deleteAlbum],
  )

  // Add to album handler (placeholder - requires album membership API)
  const handleAddToAlbum = useCallback(async (albumIds: string[]) => {
    // TODO: Implement when album membership API is ready
    logger.info('Add to albums', { albumIds })
    toast.success('Added to albums!')
  }, [])

  // Link to MOC handler (placeholder - requires MOC linking API)
  const handleLinkToMoc = useCallback(async (mocIds: string[]) => {
    // TODO: Implement when MOC linking API is ready
    logger.info('Link to MOCs', { mocIds })
    toast.success('Linked to MOCs!')
  }, [])

  // Inspiration context menu actions
  const openEditInspiration = (inspiration: Inspiration) => {
    setSelectedInspiration(inspiration)
    setIsEditInspirationModalOpen(true)
  }

  const openDeleteInspiration = (inspiration: Inspiration) => {
    setSelectedInspiration(inspiration)
    setIsDeleteInspirationModalOpen(true)
  }

  const openAddToAlbum = (inspiration: Inspiration) => {
    setSelectedInspiration(inspiration)
    setIsAddToAlbumModalOpen(true)
  }

  const openLinkInspirationToMoc = (inspiration: Inspiration) => {
    setSelectedInspiration(inspiration)
    setIsLinkToMocModalOpen(true)
  }

  // Album context menu actions
  const openDeleteAlbum = (album: AlbumWithMetadata) => {
    setSelectedAlbum(album)
    setIsDeleteAlbumModalOpen(true)
  }

  const openLinkAlbumToMoc = (album: AlbumWithMetadata) => {
    setSelectedAlbum(album)
    setIsLinkToMocModalOpen(true)
  }

  const handleInspirationClick = (id: string) => {
    // TODO: Open inspiration detail modal
    const inspiration = inspirations.find(i => i.id === id)
    if (inspiration) {
      openEditInspiration(inspiration)
    }
  }

  const handleAlbumClick = (id: string) => {
    // TODO: Navigate to album page
    logger.info('Open album', { albumId: id })
  }

  const handleOpenCreateAlbumModal = () => {
    setIsCreateAlbumModalOpen(true)
  }

  // Keyboard shortcuts
  useGalleryKeyboard({
    enabled: true,
    containerRef: galleryContainerRef,
    onEscape: () => {
      currentMultiSelect.clearSelection()
    },
    onDelete: () => {
      if (currentMultiSelect.selectionCount > 0) {
        // TODO: Implement bulk delete
        toast.info(`Delete ${currentMultiSelect.selectionCount} items`)
      }
    },
    onSelectAll: () => {
      if (activeTab === 'all') {
        inspirationMultiSelect.enterMultiSelectMode()
        inspirationMultiSelect.selectAll(inspirationIds)
      } else {
        albumMultiSelect.enterMultiSelectMode()
        albumMultiSelect.selectAll(albumIds)
      }
    },
    onAddToAlbum: () => {
      if (inspirationMultiSelect.selectionCount > 0) {
        setIsAddToAlbumModalOpen(true)
      }
    },
    onLinkToMoc: () => {
      if (currentMultiSelect.selectionCount > 0) {
        setIsLinkToMocModalOpen(true)
      }
    },
    onUpload: () => setIsUploadModalOpen(true),
    onNewAlbum: () => setIsCreateAlbumModalOpen(true),
  })

  // Determine loading and error states
  const isLoading = activeTab === 'all' ? isLoadingInspirations : isLoadingAlbums
  const error = activeTab === 'all' ? inspirationsError : albumsError

  // Determine if empty
  const isFirstTimeUser = inspirations.length === 0 && albums.length === 0 && !searchQuery
  const hasNoResults =
    searchQuery && (activeTab === 'all' ? inspirations.length === 0 : albums.length === 0)

  return (
    <div
      ref={galleryContainerRef}
      className={cn('space-y-6', className)}
      data-testid="inspiration-gallery"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Inspiration Gallery</h1>
          <p className="text-muted-foreground">
            Collect and organize visual inspiration for your LEGO MOC builds.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Multi-select toggle */}
          <Button
            variant={currentMultiSelect.isMultiSelectMode ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              if (currentMultiSelect.isMultiSelectMode) {
                currentMultiSelect.exitMultiSelectMode()
              } else {
                currentMultiSelect.enterMultiSelectMode()
              }
            }}
            aria-pressed={currentMultiSelect.isMultiSelectMode}
          >
            <CheckSquare className="h-4 w-4 mr-2" />
            Select
          </Button>
          <Button variant="outline" onClick={handleOpenCreateAlbumModal}>
            <FolderPlus className="h-4 w-4 mr-2" />
            New Album
          </Button>
          <Button onClick={() => setIsUploadModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Inspiration
          </Button>
        </div>
      </div>

      {/* Tabs and Controls */}
      <Tabs value={activeTab} onValueChange={v => setActiveTab(v as ActiveTab)}>
        <div className="flex items-center justify-between border-b">
          <TabsList className="border-0">
            <TabsTrigger value="all">
              All Inspirations
              {inspirationsData?.pagination ? (
                <span className="ml-2 text-xs text-muted-foreground">
                  ({inspirationsData.pagination.total})
                </span>
              ) : null}
            </TabsTrigger>
            <TabsTrigger value="albums">
              Albums
              {albumsData?.pagination ? (
                <span className="ml-2 text-xs text-muted-foreground">
                  ({albumsData.pagination.total})
                </span>
              ) : null}
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-3 pb-2">
            {/* Search */}
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Sort */}
            <Select value={sortBy} onValueChange={v => setSortBy(v as SortOption)}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sortOrder">Custom Order</SelectItem>
                <SelectItem value="createdAt">Date Added</SelectItem>
                <SelectItem value="title">Title</SelectItem>
              </SelectContent>
            </Select>

            {/* View toggle */}
            <div className="flex items-center rounded-md border">
              <button
                onClick={() => setViewMode('grid')}
                className={cn(
                  'p-2 transition-colors',
                  viewMode === 'grid'
                    ? 'bg-muted text-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
                aria-label="Grid view"
              >
                <Grid3X3 className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={cn(
                  'p-2 transition-colors',
                  viewMode === 'list'
                    ? 'bg-muted text-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
                aria-label="List view"
              >
                <LayoutList className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Loading state */}
        {isLoading ? (
          <GalleryLoadingSkeleton
            variant={activeTab === 'all' ? 'inspirations' : 'albums'}
            count={12}
          />
        ) : null}

        {/* Error state */}
        {error && !isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-destructive mb-2">Failed to load content</p>
            <p className="text-sm text-muted-foreground">Please try again later.</p>
          </div>
        ) : null}

        {/* Content */}
        {!isLoading && !error && (
          <>
            {/* All Inspirations Tab */}
            <TabsContent value="all" className="mt-6">
              {isFirstTimeUser ? (
                <EmptyState
                  variant="first-time"
                  onPrimaryAction={() => setIsUploadModalOpen(true)}
                  onSecondaryAction={() => {
                    // TODO: Show onboarding tour
                  }}
                />
              ) : hasNoResults ? (
                <EmptyState
                  variant="no-search-results"
                  searchQuery={searchQuery}
                  onPrimaryAction={() => setSearchQuery('')}
                />
              ) : inspirations.length === 0 ? (
                <EmptyState
                  variant="no-inspirations"
                  onPrimaryAction={() => setIsUploadModalOpen(true)}
                  onSecondaryAction={handleOpenCreateAlbumModal}
                />
              ) : viewMode === 'grid' && sortBy === 'sortOrder' ? (
                // Use DraggableInspirationGallery for grid view with custom sort order
                <DraggableInspirationGallery
                  items={inspirations as Inspiration[]}
                  isDraggingEnabled={true}
                  onCardClick={handleInspirationClick}
                  onMenuClick={(id, e) => {
                    // TODO: Open context menu
                    logger.info('Menu clicked', { inspirationId: id, event: e.type })
                  }}
                />
              ) : (
                <div
                  className={cn(
                    viewMode === 'grid'
                      ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4'
                      : 'flex flex-col gap-2',
                  )}
                >
                  {inspirations.map(inspiration => (
                    <InspirationContextMenu
                      key={inspiration.id}
                      item={{
                        id: inspiration.id,
                        title: inspiration.title,
                        sourceUrl: inspiration.sourceUrl,
                      }}
                      onEdit={() => openEditInspiration(inspiration)}
                      onAddToAlbum={() => openAddToAlbum(inspiration)}
                      onLinkToMoc={() => openLinkInspirationToMoc(inspiration)}
                      onDelete={() => openDeleteInspiration(inspiration)}
                    >
                      <InspirationCard
                        id={inspiration.id}
                        title={inspiration.title}
                        imageUrl={inspiration.imageUrl}
                        thumbnailUrl={inspiration.thumbnailUrl}
                        sourceUrl={inspiration.sourceUrl}
                        tags={inspiration.tags}
                        isSelected={inspirationMultiSelect.selectedIds.has(inspiration.id)}
                        selectionMode={inspirationMultiSelect.isMultiSelectMode}
                        onClick={() => {
                          if (!inspirationMultiSelect.isMultiSelectMode) {
                            handleInspirationClick(inspiration.id)
                          }
                        }}
                        onSelect={() => {
                          inspirationMultiSelect.toggleSelect(inspiration.id, false)
                        }}
                        onMenuClick={e => {
                          e.stopPropagation()
                          // Context menu opens via parent wrapper
                        }}
                      />
                    </InspirationContextMenu>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Albums Tab */}
            <TabsContent value="albums" className="mt-6">
              {hasNoResults ? (
                <EmptyState
                  variant="no-search-results"
                  searchQuery={searchQuery}
                  onPrimaryAction={() => setSearchQuery('')}
                />
              ) : albums.length === 0 ? (
                <EmptyState variant="no-albums" onPrimaryAction={handleOpenCreateAlbumModal} />
              ) : (
                <div
                  className={cn(
                    viewMode === 'grid'
                      ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4'
                      : 'flex flex-col gap-2',
                  )}
                >
                  {albums.map(album => (
                    <AlbumContextMenu
                      key={album.id}
                      item={{
                        id: album.id,
                        title: album.title,
                      }}
                      onEdit={() => {
                        // TODO: Implement album edit modal
                        logger.info('Edit album', { albumId: album.id })
                      }}
                      onAddInspirations={() => {
                        // TODO: Navigate to album or open add modal
                        handleAlbumClick(album.id)
                      }}
                      onCreateSubAlbum={() => {
                        // TODO: Open create album modal with parent
                        setIsCreateAlbumModalOpen(true)
                      }}
                      onLinkToMoc={() => openLinkAlbumToMoc(album)}
                      onDelete={() => openDeleteAlbum(album)}
                    >
                      <AlbumCard
                        id={album.id}
                        title={album.title}
                        description={album.description}
                        coverImageUrl={album.coverImage?.thumbnailUrl || album.coverImage?.imageUrl}
                        itemCount={album.itemCount}
                        childAlbumCount={album.childAlbumCount}
                        tags={album.tags}
                        isSelected={albumMultiSelect.selectedIds.has(album.id)}
                        selectionMode={albumMultiSelect.isMultiSelectMode}
                        onClick={() => {
                          if (!albumMultiSelect.isMultiSelectMode) {
                            handleAlbumClick(album.id)
                          }
                        }}
                        onSelect={() => {
                          albumMultiSelect.toggleSelect(album.id, false)
                        }}
                        onMenuClick={e => {
                          e.stopPropagation()
                          // Context menu opens via parent wrapper
                        }}
                      />
                    </AlbumContextMenu>
                  ))}
                </div>
              )}
            </TabsContent>
          </>
        )}
      </Tabs>

      {/* Upload Modal */}
      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUpload={handleUpload}
      />

      {/* Create Album Modal */}
      <CreateAlbumModal
        isOpen={isCreateAlbumModalOpen}
        onClose={() => setIsCreateAlbumModalOpen(false)}
        onCreate={handleCreateAlbum}
        parentAlbums={albums.map(a => ({ id: a.id, title: a.title }))}
      />

      {/* Edit Inspiration Modal */}
      <EditInspirationModal
        isOpen={isEditInspirationModalOpen}
        onClose={() => {
          setIsEditInspirationModalOpen(false)
          setSelectedInspiration(null)
        }}
        onSave={handleEditInspiration}
        item={
          selectedInspiration
            ? {
                id: selectedInspiration.id,
                title: selectedInspiration.title,
                description: selectedInspiration.description,
                imageUrl: selectedInspiration.imageUrl,
                thumbnailUrl: selectedInspiration.thumbnailUrl,
                sourceUrl: selectedInspiration.sourceUrl,
                tags: selectedInspiration.tags,
              }
            : null
        }
      />

      {/* Delete Inspiration Modal */}
      <DeleteInspirationModal
        isOpen={isDeleteInspirationModalOpen}
        onClose={() => {
          setIsDeleteInspirationModalOpen(false)
          setSelectedInspiration(null)
        }}
        onConfirm={handleDeleteInspiration}
        item={
          selectedInspiration
            ? {
                id: selectedInspiration.id,
                title: selectedInspiration.title,
                imageUrl: selectedInspiration.imageUrl,
                thumbnailUrl: selectedInspiration.thumbnailUrl,
                // TODO: Get album membership info
                albumCount: 0,
                albumNames: [],
              }
            : null
        }
        isDeleting={isDeletingInspiration}
      />

      {/* Delete Album Modal */}
      <DeleteAlbumModal
        isOpen={isDeleteAlbumModalOpen}
        onClose={() => {
          setIsDeleteAlbumModalOpen(false)
          setSelectedAlbum(null)
        }}
        onConfirm={handleDeleteAlbum}
        item={
          selectedAlbum
            ? {
                id: selectedAlbum.id,
                title: selectedAlbum.title,
                coverImageUrl:
                  selectedAlbum.coverImage?.thumbnailUrl || selectedAlbum.coverImage?.imageUrl,
                itemCount: selectedAlbum.itemCount,
                childAlbumCount: selectedAlbum.childAlbumCount,
              }
            : null
        }
        isDeleting={isDeletingAlbum}
      />

      {/* Add to Album Modal */}
      <AddToAlbumModal
        isOpen={isAddToAlbumModalOpen}
        onClose={() => {
          setIsAddToAlbumModalOpen(false)
          setSelectedInspiration(null)
        }}
        onConfirm={handleAddToAlbum}
        onCreateAlbum={() => {
          setIsAddToAlbumModalOpen(false)
          setIsCreateAlbumModalOpen(true)
        }}
        albums={albums.map(a => ({
          id: a.id,
          title: a.title,
          coverImageUrl: a.coverImage?.thumbnailUrl || a.coverImage?.imageUrl,
          itemCount: a.itemCount,
        }))}
        currentAlbumIds={[]}
        itemLabel={selectedInspiration ? '1 inspiration' : '1 item'}
      />

      {/* Link to MOC Modal */}
      <LinkToMocModal
        isOpen={isLinkToMocModalOpen}
        onClose={() => {
          setIsLinkToMocModalOpen(false)
          setSelectedInspiration(null)
          setSelectedAlbum(null)
        }}
        onConfirm={handleLinkToMoc}
        mocs={[]}
        currentMocIds={[]}
        linkType={selectedAlbum ? 'album' : 'inspiration'}
        itemLabel={
          selectedAlbum
            ? selectedAlbum.title
            : selectedInspiration
              ? selectedInspiration.title
              : '1 item'
        }
      />

      {/* Bulk Actions Bar */}
      {activeTab === 'all' ? (
        <BulkActionsBar
          selectionCount={inspirationMultiSelect.selectionCount}
          totalCount={inspirations.length}
          itemType="inspirations"
          onClearSelection={inspirationMultiSelect.clearSelection}
          onSelectAll={() => inspirationMultiSelect.selectAll(inspirationIds)}
          onAddToAlbum={() => setIsAddToAlbumModalOpen(true)}
          onLinkToMoc={() => setIsLinkToMocModalOpen(true)}
          onDelete={() => {
            // TODO: Implement bulk delete for inspirations
            toast.info(`Delete ${inspirationMultiSelect.selectionCount} inspirations`)
          }}
        />
      ) : (
        <BulkActionsBar
          selectionCount={albumMultiSelect.selectionCount}
          totalCount={albums.length}
          itemType="albums"
          onClearSelection={albumMultiSelect.clearSelection}
          onSelectAll={() => albumMultiSelect.selectAll(albumIds)}
          onLinkToMoc={() => setIsLinkToMocModalOpen(true)}
          onDelete={() => {
            // TODO: Implement bulk delete for albums
            toast.info(`Delete ${albumMultiSelect.selectionCount} albums`)
          }}
        />
      )}
    </div>
  )
}

export default MainPage
