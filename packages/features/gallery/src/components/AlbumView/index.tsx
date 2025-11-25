import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  useGetAlbumByIdQuery,
  useUpdateAlbumMutation,
  useDeleteAlbumMutation,
  useRemoveImageFromAlbumMutation,
} from '../../store/albumsApi.js'
import ImageCard from '../ImageCard/index.js'
import { useAlbumDragAndDrop } from '../../hooks/useAlbumDragAndDrop.js'

interface AlbumViewProps {
  albumId: string
  onBack?: () => void
  onEdit?: () => void
  onShare?: () => void
  onImagesSelected?: (imageIds: string[]) => void
  selectedImages?: string[]
}

const AlbumView: React.FC<AlbumViewProps> = ({
  albumId,
  onBack,
  onEdit,
  onShare,
  onImagesSelected,
  selectedImages = [],
}) => {
  const { data, error, isLoading, refetch } = useGetAlbumByIdQuery(albumId)
  const [updateAlbum] = useUpdateAlbumMutation()
  const [deleteAlbum] = useDeleteAlbumMutation()
  const [removeImageFromAlbum] = useRemoveImageFromAlbumMutation()

  const { actions: dragActions } = useAlbumDragAndDrop()

  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Set edit form values when data loads
  useEffect(() => {
    if (data?.album) {
      setEditTitle(data.album.title)
      setEditDescription(data.album.description || '')
    }
  }, [data?.album])

  const handleSaveEdit = async () => {
    if (!data?.album) return

    try {
      await updateAlbum({
        id: albumId,
        data: {
          title: editTitle,
          description: editDescription,
        },
      }).unwrap()
      setIsEditing(false)
    } catch (error) {
      console.error('Failed to update album:', error)
    }
  }

  const handleCancelEdit = () => {
    setEditTitle(data?.album?.title || '')
    setEditDescription(data?.album?.description || '')
    setIsEditing(false)
  }

  const handleDeleteAlbum = async () => {
    try {
      await deleteAlbum(albumId).unwrap()
      onBack?.()
    } catch (error) {
      console.error('Failed to delete album:', error)
    }
  }

  const handleRemoveImage = async (imageId: string) => {
    try {
      await removeImageFromAlbum({ albumId, imageId }).unwrap()
    } catch (error) {
      console.error('Failed to remove image from album:', error)
    }
  }

  const handleViewImage = (imageId: string) => {
    console.log('View image:', imageId)
    // TODO: Implement lightbox or modal for image viewing
  }

  const handleShareImage = (imageId: string) => {
    console.log('Share image:', imageId)
    // TODO: Implement image sharing
  }

  const handleDownloadImage = (imageId: string) => {
    console.log('Download image:', imageId)
    // TODO: Implement image download
  }

  const handleDragStart = (e: React.DragEvent, imageId: string) => {
    dragActions.handleDragStart(e, [imageId])
  }

  const handleImageSelect = (imageId: string, checked: boolean) => {
    if (onImagesSelected) {
      const newSelected = checked
        ? [...selectedImages, imageId]
        : selectedImages.filter(id => id !== imageId)
      onImagesSelected(newSelected)
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse" data-testid="loading-skeleton">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6 lg:gap-8">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="animate-pulse">
                <div className="bg-gray-200 rounded-lg h-48 mb-4"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <div className="text-red-600 text-lg font-medium mb-2">Failed to load album</div>
          <div className="text-gray-500 text-sm mb-4">Please try refreshing the page</div>
          <div className="flex justify-center space-x-4">
            <button
              onClick={() => refetch()}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Retry
            </button>
            {onBack ? (
              <button
                onClick={onBack}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
              >
                Go Back
              </button>
            ) : null}
          </div>
        </div>
      </div>
    )
  }

  if (!data?.album) {
    return (
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <div className="text-gray-500 text-lg mb-2">Album not found</div>
          {onBack ? (
            <button
              onClick={onBack}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Go Back
            </button>
          ) : null}
        </div>
      </div>
    )
  }

  const { album, images } = data

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Album Header */}
      <motion.div
        className="mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            {onBack ? (
              <button
                onClick={onBack}
                className="p-2 text-gray-600 hover:text-gray-900 transition-colors"
                aria-label="Go back"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>
            ) : null}

            {isEditing ? (
              <div className="flex-1 max-w-2xl">
                <input
                  type="text"
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  className="w-full text-3xl font-bold text-gray-900 border-b-2 border-blue-500 focus:outline-none focus:border-blue-600"
                  placeholder="Album title"
                />
                <textarea
                  value={editDescription}
                  onChange={e => setEditDescription(e.target.value)}
                  className="w-full mt-2 text-gray-600 border-b border-gray-300 focus:outline-none focus:border-blue-500 resize-none"
                  placeholder="Album description (optional)"
                  rows={2}
                />
              </div>
            ) : (
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-gray-900">{album.title}</h1>
                {album.description ? (
                  <p className="text-gray-600 mt-2">{album.description}</p>
                ) : null}
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {isEditing ? (
              <>
                <button
                  onClick={handleSaveEdit}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                >
                  Save
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Edit
                </button>
                {onShare ? (
                  <button
                    onClick={onShare}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                  >
                    Share
                  </button>
                ) : null}
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                >
                  Delete
                </button>
              </>
            )}
          </div>
        </div>

        {/* Album Metadata */}
        <div className="flex items-center space-x-6 text-sm text-gray-500">
          <span>
            {images?.length || 0} image{(images?.length || 0) !== 1 ? 's' : ''}
          </span>
          <span>Created {new Date(album.createdAt).toLocaleDateString()}</span>
          <span>Last updated {new Date(album.lastUpdatedAt).toLocaleDateString()}</span>
        </div>

        {/* Images Grid */}
        <div
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6"
          role="grid"
        >
          {images?.map(image => (
            <ImageCard
              key={image.id}
              src={image.url}
              title={image.title}
              description={image.description ?? ''}
              author={image.author ?? ''}
              uploadDate={image.uploadDate}
              tags={image.tags ?? []}
              onView={() => handleViewImage(image.id)}
              onShare={() => handleShareImage(image.id)}
              onDownload={() => handleDownloadImage(image.id)}
              onDelete={() => handleRemoveImage(image.id)}
              draggableId={image.id}
              onDragStart={id => handleDragStart({} as React.DragEvent, id)}
              selected={selectedImages.includes(image.id)}
              onSelect={checked => handleImageSelect(image.id, checked)}
            />
          ))}
        </div>
      </motion.div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm ? (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Delete Album</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete "{album.title}"? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAlbum}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default AlbumView
