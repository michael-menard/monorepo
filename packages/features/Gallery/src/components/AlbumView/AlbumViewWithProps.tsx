import React, { useState } from 'react';
import { motion } from 'framer-motion';
import ImageCard from '../ImageCard/index.js';
import type { GalleryImage } from '../../types/index.js';

export interface Album {
  id: string;
  title: string;
  description?: string;
  createdAt: Date;
  lastUpdatedAt: Date;
  coverImageId?: string;
}

export interface AlbumViewWithPropsProps {
  album: Album;
  images: GalleryImage[];
  onBack?: () => void;
  onEdit?: (albumId: string, data: Partial<Album>) => void;
  onDelete?: (albumId: string) => void;
  onShare?: (albumId: string) => void;
  onImageClick?: (image: GalleryImage) => void;
  onImageLike?: (imageId: string, liked: boolean) => void;
  onImageShare?: (imageId: string) => void;
  onImageDelete?: (imageId: string) => void;
  onImageDownload?: (imageId: string) => void;
  onImageAddToAlbum?: (imageId: string) => void;
  onRemoveImageFromAlbum?: (albumId: string, imageId: string) => void;
  className?: string;
}

const AlbumViewWithProps: React.FC<AlbumViewWithPropsProps> = ({
  album,
  images,
  onBack,
  onEdit,
  onDelete,
  onShare,
  onImageClick,
  onImageLike,
  onImageShare,
  onImageDelete,
  onImageDownload,
  onImageAddToAlbum,
  onRemoveImageFromAlbum,
  className = '',
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(album.title);
  const [editDescription, setEditDescription] = useState(album.description || '');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleSaveEdit = () => {
    if (onEdit) {
      onEdit(album.id, {
        title: editTitle,
        description: editDescription,
      });
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditTitle(album.title);
    setEditDescription(album.description || '');
    setIsEditing(false);
  };

  const handleDeleteAlbum = () => {
    if (onDelete) {
      onDelete(album.id);
    }
    setShowDeleteConfirm(false);
  };

  const handleRemoveImage = (imageId: string) => {
    if (onRemoveImageFromAlbum) {
      onRemoveImageFromAlbum(album.id, imageId);
    }
  };

  const handleShareAlbum = () => {
    if (onShare) {
      onShare(album.id);
    }
  };

  if (!images || images.length === 0) {
    return (
      <div className={`w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 ${className}`}>
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Album Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              {onBack && (
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
              )}

              <div className="flex-1">
                <h1 className="text-3xl font-bold text-gray-900">{album.title}</h1>
                {album.description && <p className="text-gray-600 mt-2">{album.description}</p>}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Edit
              </button>
              {onShare && (
                <button
                  onClick={handleShareAlbum}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                >
                  Share
                </button>
              )}
              {onDelete && (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                >
                  Delete
                </button>
              )}
            </div>
          </div>

          {/* Album Metadata */}
          <div className="flex items-center space-x-6 text-sm text-gray-500 mb-8">
            <span>0 images</span>
            <span>Created {album.createdAt.toLocaleDateString()}</span>
            <span>Last updated {album.lastUpdatedAt.toLocaleDateString()}</span>
          </div>

          {/* Empty State */}
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📁</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Album is empty</h3>
            <p className="text-gray-600">Add some images to this album to get started!</p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={`w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 ${className}`}>
      {/* Album Header */}
      <motion.div
        className="mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            {onBack && (
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
            )}

            {isEditing ? (
              <div className="flex-1 max-w-2xl">
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full text-3xl font-bold text-gray-900 border-b-2 border-blue-500 focus:outline-none focus:border-blue-600"
                  placeholder="Album title"
                />
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full mt-2 text-gray-600 border-b border-gray-300 focus:outline-none focus:border-blue-500 resize-none"
                  placeholder="Album description (optional)"
                  rows={2}
                />
              </div>
            ) : (
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-gray-900">{album.title}</h1>
                {album.description && <p className="text-gray-600 mt-2">{album.description}</p>}
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
                {onShare && (
                  <button
                    onClick={handleShareAlbum}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                  >
                    Share
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                  >
                    Delete
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Album Metadata */}
        <div className="flex items-center space-x-6 text-sm text-gray-500">
          <span>
            {images.length} image{images.length !== 1 ? 's' : ''}
          </span>
          <span>Created {album.createdAt.toLocaleDateString()}</span>
          <span>Last updated {album.lastUpdatedAt.toLocaleDateString()}</span>
        </div>
      </motion.div>

      {/* Images Grid - Reusing Gallery Layout */}
      <div
        className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6"
        role="grid"
      >
        {images.map((image, index) => (
          <motion.div
            key={image.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
          >
            <ImageCard
              src={image.url}
              alt={image.title || image.description || 'Gallery image'}
              title={image.title || 'Untitled'}
              description={image.description}
              author={image.author}
              uploadDate={image.createdAt}
              tags={image.tags}
              onView={() => onImageClick?.(image)}
              onLike={(liked) => onImageLike?.(image.id, liked)}
              onShare={() => onImageShare?.(image.id)}
              onDelete={() =>
                onRemoveImageFromAlbum
                  ? onRemoveImageFromAlbum(album.id, image.id)
                  : onImageDelete?.(image.id)
              }
              onDownload={() => onImageDownload?.(image.id)}
              onAddToAlbum={() => onImageAddToAlbum?.(image.id)}
            />
          </motion.div>
        ))}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
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
      )}
    </div>
  );
};

export default AlbumViewWithProps;
