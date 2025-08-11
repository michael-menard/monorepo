import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, FolderPlus, Download, Share2, X, Check } from 'lucide-react';
import { Button } from '@repo/ui';
import { useDeleteImageMutation } from '../../store/galleryApi.js';
import { useCreateAlbumMutation, useAddImageToAlbumMutation } from '../../store/albumsApi.js';
import CreateAlbumDialog from '../CreateAlbumDialog/index.js';
// import { z } from 'zod';


// Schema not used at runtime currently; remove to avoid unused var error



interface BatchOperationsToolbarProps {
  selectedImages: string[];
  totalImages: number;
  onClearSelection: () => void;
  onImagesDeleted?: (deletedIds: string[]) => void;
  onImagesAddedToAlbum?: (imageIds: string[], albumId: string) => void;
  onImagesDownloaded?: (imageIds: string[]) => void;
  onImagesShared?: (imageIds: string[]) => void;
  className?: string;
}

const BatchOperationsToolbar: React.FC<BatchOperationsToolbarProps> = ({
  selectedImages,
  totalImages,
  onClearSelection,
  onImagesDeleted,
  onImagesAddedToAlbum,
  onImagesDownloaded,
  onImagesShared,
  className = '',
}) => {
  const [showCreateAlbumDialog, setShowCreateAlbumDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // RTK Query mutations
  const [deleteImage] = useDeleteImageMutation();
  const [addImageToAlbum] = useAddImageToAlbumMutation();
  const [createAlbum] = useCreateAlbumMutation();

  const selectedCount = selectedImages.length;
  const isVisible = selectedCount > 0;

  const handleBatchDelete = async () => {
    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true);
      return;
    }

    setIsProcessing(true);
    try {
      // Delete all selected images
      const deletePromises = selectedImages.map((imageId) => deleteImage(imageId).unwrap());

      await Promise.all(deletePromises);

      onImagesDeleted?.(selectedImages);
      onClearSelection();
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error('Failed to delete images:', error);
      // You might want to show a toast notification here
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBatchAddToAlbum = async (albumId: string) => {
    setIsProcessing(true);
    try {
      // Add all selected images to the album
      const addPromises = selectedImages.map((imageId) => addImageToAlbum({ albumId, imageId }).unwrap());

      await Promise.all(addPromises);

      onImagesAddedToAlbum?.(selectedImages, albumId);
      onClearSelection();
      setShowCreateAlbumDialog(false);
    } catch (error) {
      console.error('Failed to add images to album:', error);
      // You might want to show a toast notification here
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBatchDownload = async () => {
    try {
      // Create download links for all selected images
      const downloadPromises = selectedImages.map(async (imageId) => {
        // This would typically fetch the image URL and trigger download
        // For now, we'll just simulate the download
        const link = document.createElement('a');
        link.href = `/api/gallery/${imageId}/download`;
        link.download = `image-${imageId}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      });
      
      await Promise.all(downloadPromises);
      onImagesDownloaded?.(selectedImages);
    } catch (error) {
      console.error('Failed to download images:', error);
    }
  };

  const handleBatchShare = async () => {
    try {
      // This would typically open a share dialog or copy links to clipboard
      const shareUrls = selectedImages.map((imageId) => 
        `${window.location.origin}/gallery/${imageId}`
      );
      
      if (navigator.share) {
        await navigator.share({
          title: 'Shared Images',
          text: `Sharing ${selectedCount} images`,
          url: shareUrls[0],
        });
      } else {
        // Fallback: copy URLs to clipboard
        await navigator.clipboard.writeText(shareUrls.join('\n'));
      }
      
      onImagesShared?.(selectedImages);
    } catch (error) {
      console.error('Failed to share images:', error);
    }
  };

  const handleCreateAlbum = async (albumData: { name: string; description?: string }) => {
    try {
      const result = await createAlbum(albumData).unwrap();
      await handleBatchAddToAlbum(result.album.id);
    } catch (error) {
      console.error('Failed to create album:', error);
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <>
      <motion.div
        className={`fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-4 ${className}`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex items-center gap-4">
          {/* Selection Info */}
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Check className="w-4 h-4 text-green-600" />
            <span>
              {selectedCount} of {totalImages} selected
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCreateAlbumDialog(true)}
              disabled={isProcessing}
              className="flex items-center gap-1"
            >
              <FolderPlus className="w-4 h-4" />
              Add to Album
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleBatchDownload}
              disabled={isProcessing}
              className="flex items-center gap-1"
            >
              <Download className="w-4 h-4" />
              Download
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleBatchShare}
              disabled={isProcessing}
              className="flex items-center gap-1"
            >
              <Share2 className="w-4 h-4" />
              Share
            </Button>

            <Button
              variant="destructive"
              size="sm"
              onClick={handleBatchDelete}
              disabled={isProcessing}
              className="flex items-center gap-1"
            >
              <Trash2 className="w-4 h-4" />
              {showDeleteConfirm ? 'Confirm Delete' : 'Delete'}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={onClearSelection}
              disabled={isProcessing}
              className="flex items-center gap-1"
            >
              <X className="w-4 h-4" />
              Clear
            </Button>
          </div>
        </div>

        {/* Processing Indicator */}
        <AnimatePresence>
          {isProcessing && (
            <motion.div
              className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-lg"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                Processing...
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Create Album Dialog */}
      <CreateAlbumDialog
        isOpen={showCreateAlbumDialog}
        onClose={() => setShowCreateAlbumDialog(false)}
        selectedImages={selectedImages.map((id) => ({ id, url: '', title: `Image ${id}`, createdAt: new Date(), updatedAt: new Date() }))}
        onAlbumCreated={handleCreateAlbum}
        onImagesSelected={() => {}} // Not needed for this use case
      />

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white rounded-lg p-6 max-w-md w-full mx-4"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Delete {selectedCount} Image{selectedCount !== 1 ? 's' : ''}
              </h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete {selectedCount} selected image{selectedCount !== 1 ? 's' : ''}? 
                This action cannot be undone.
              </p>
              <div className="flex justify-end space-x-3">
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isProcessing}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleBatchDelete}
                  disabled={isProcessing}
                >
                  {isProcessing ? 'Deleting...' : 'Delete'}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default BatchOperationsToolbar; 