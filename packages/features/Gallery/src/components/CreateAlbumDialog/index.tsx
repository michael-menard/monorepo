import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCreateAlbumMutation, useAddImageToAlbumMutation } from '../../store/albumsApi.js';
import { GalleryImage } from '../../store/albumsApi.js';
import { GalleryAlbum } from '../../store/albumsApi.js';
import { useAlbumDragAndDrop } from '../../hooks/useAlbumDragAndDrop.js';
import { AlbumCreationDataSchema, CreateAlbumDialogProps } from '../../schemas/index.js';
import { z } from 'zod';

const CreateAlbumDialog: React.FC<CreateAlbumDialogProps> = ({
  isOpen,
  onClose,
  selectedImages,
  onAlbumCreated,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const [createAlbum] = useCreateAlbumMutation();
  const [addImageToAlbum] = useAddImageToAlbumMutation();

  const { state: dragState, actions: dragActions } = useAlbumDragAndDrop();

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setDescription('');
      setError(null);
      setValidationErrors({});
      setIsCreating(false);
    }
  }, [isOpen]);

  const validateForm = (): boolean => {
    try {
      const formData: AlbumCreationData = {
        title: title.trim(),
        description: description.trim() || undefined,
        imageIds: selectedImages.map((img) => img.id),
      };

      AlbumCreationDataSchema.parse(formData);
      setValidationErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: Record<string, string> = {};
        error.errors.forEach((err) => {
          const field = err.path[0] as string;
          errors[field] = err.message;
        });
        setValidationErrors(errors);
      }
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      // Create the album
      const albumData: Partial<GalleryAlbum> = {
        title: title.trim(),
      };

      if (description.trim()) {
        albumData.description = description.trim();
      }

      const albumResult = await createAlbum(albumData).unwrap();

      const albumId = albumResult.album.id;

      // Add selected images to the album
      const addImagePromises = selectedImages.map((image) =>
        addImageToAlbum({
          albumId,
          imageId: image.id,
        }).unwrap(),
      );

      await Promise.all(addImagePromises);

      // Call the callback with the new album ID
      onAlbumCreated?.(albumId);

      // Close the dialog
      onClose();
    } catch (err) {
      console.error('Failed to create album:', err);
      setError('Failed to create album. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleCancel = () => {
    if (!isCreating) {
      onClose();
    }
  };

  const handleImagesDropped = (imageIds: string[]) => {
    // This would typically be handled by the parent component
    // that manages the selectedImages state
    console.log('Images dropped:', imageIds);
  };

  const handleDrop = (e: React.DragEvent) => {
    dragActions.handleDrop(e, handleImagesDropped);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleCancel}
        >
          <motion.div
            className={`w-full max-w-md bg-white rounded-lg shadow-xl p-6 mx-4 ${
              dragState.isDragOver ? 'ring-4 ring-blue-400 bg-blue-50' : ''
            }`}
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            {...dragActions.dragAreaProps}
            onDrop={handleDrop}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Create New Album</h2>
              <button
                onClick={handleCancel}
                disabled={isCreating}
                className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Drag Drop Zone */}
            {dragState.isDragOver && (
              <motion.div
                className="absolute inset-0 bg-blue-100 bg-opacity-90 rounded-lg flex items-center justify-center z-10"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <div className="text-center">
                  <div className="text-4xl mb-2">📁</div>
                  <p className="text-blue-800 font-medium">Drop images here to add to album</p>
                </div>
              </motion.div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Album Title */}
              <div>
                <label
                  htmlFor="album-title"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Album Title *
                </label>
                <input
                  id="album-title"
                  type="text"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    if (validationErrors.title) {
                      setValidationErrors((prev) => ({ ...prev, title: '' }));
                    }
                  }}
                  placeholder="Enter album title..."
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    validationErrors.title ? 'border-red-300' : 'border-gray-300'
                  }`}
                  disabled={isCreating}
                  required
                />
                {validationErrors.title && (
                  <p className="mt-1 text-sm text-red-600">{validationErrors.title}</p>
                )}
              </div>

              {/* Album Description */}
              <div>
                <label
                  htmlFor="album-description"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Description (Optional)
                </label>
                <textarea
                  id="album-description"
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value);
                    if (validationErrors.description) {
                      setValidationErrors((prev) => ({ ...prev, description: '' }));
                    }
                  }}
                  placeholder="Enter album description..."
                  rows={3}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none ${
                    validationErrors.description ? 'border-red-300' : 'border-gray-300'
                  }`}
                  disabled={isCreating}
                />
                {validationErrors.description && (
                  <p className="mt-1 text-sm text-red-600">{validationErrors.description}</p>
                )}
              </div>

              {/* Selected Images Preview */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Selected Images ({selectedImages.length})
                </label>
                <div className="max-h-32 overflow-y-auto border border-gray-200 rounded-md p-3 bg-gray-50">
                  {selectedImages.length === 0 ? (
                    <div className="text-center py-4">
                      <p className="text-gray-500 text-sm mb-2">No images selected</p>
                      <p className="text-gray-400 text-xs">
                        Drag images from the gallery to add them here
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      {selectedImages.map((image) => (
                        <div key={image.id} className="relative group">
                          <img
                            src={image.url}
                            alt={image.title}
                            className="w-full h-16 object-cover rounded-md"
                          />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-md flex items-center justify-center">
                            <span className="text-white text-xs text-center px-1">
                              {image.title}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {validationErrors.imageIds && (
                  <p className="mt-1 text-sm text-red-600">{validationErrors.imageIds}</p>
                )}
              </div>

              {/* Error Message */}
              {error && (
                <motion.div
                  className="p-3 bg-red-50 border border-red-200 rounded-md"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <p className="text-red-600 text-sm">{error}</p>
                </motion.div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={isCreating}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating || !title.trim() || selectedImages.length === 0}
                  className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {isCreating ? (
                    <>
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      <span>Creating...</span>
                    </>
                  ) : (
                    <span>Create Album</span>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CreateAlbumDialog;
