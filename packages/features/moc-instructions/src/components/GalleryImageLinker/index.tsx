import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { z } from 'zod';
import { Button } from '@repo/ui';

// Zod schemas for type safety
const GalleryImageSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  url: z.string(),
  tags: z.array(z.string()).optional(),
  createdAt: z.string(),
  lastUpdatedAt: z.string(),
});

const GalleryImageLinkerPropsSchema = z.object({
  mocId: z.string(),
  onImageLinked: z.function().args(z.string()).returns(z.void()).optional(),
  onImageUnlinked: z.function().args(z.string()).returns(z.void()).optional(),
  className: z.string().optional(),
});

export type GalleryImage = z.infer<typeof GalleryImageSchema>;
export type GalleryImageLinkerProps = z.infer<typeof GalleryImageLinkerPropsSchema>;

interface LinkedImage extends GalleryImage {
  linkedAt: string;
}

export const GalleryImageLinker: React.FC<GalleryImageLinkerProps> = ({
  mocId,
  onImageLinked,
  onImageUnlinked,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [linkedImages, setLinkedImages] = useState<LinkedImage[]>([]);
  const [availableImages, setAvailableImages] = useState<GalleryImage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch linked images for this MOC
  const fetchLinkedImages = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch(`/api/mocs/${mocId}/gallery-images`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch linked images');
      }
      
      const data = await response.json();
      setLinkedImages(data.images || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch linked images');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch available gallery images
  const fetchAvailableImages = async () => {
    try {
      const response = await fetch('/api/gallery?type=image', {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch available images');
      }
      
      const data = await response.json();
      setAvailableImages(data.items || []);
    } catch (err) {
      console.error('Failed to fetch available images:', err);
    }
  };

  // Link an image to the MOC
  const linkImage = async (imageId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch(`/api/mocs/${mocId}/gallery-images`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ galleryImageId: imageId }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to link image');
      }
      
      // Refresh linked images
      await fetchLinkedImages();
      onImageLinked?.(imageId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to link image');
    } finally {
      setIsLoading(false);
    }
  };

  // Unlink an image from the MOC
  const unlinkImage = async (imageId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch(`/api/mocs/${mocId}/gallery-images/${imageId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to unlink image');
      }
      
      // Refresh linked images
      await fetchLinkedImages();
      onImageUnlinked?.(imageId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unlink image');
    } finally {
      setIsLoading(false);
    }
  };

  // Load data when component mounts or MOC ID changes
  useEffect(() => {
    if (mocId) {
      fetchLinkedImages();
      fetchAvailableImages();
    }
  }, [mocId]);

  // Get images that are not already linked
  const unlinkedImages = availableImages.filter(
    (image) => !linkedImages.some((linked) => linked.id === image.id)
  );

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Linked Gallery Images</h3>
        <Button
          onClick={() => setIsOpen(!isOpen)}
          variant="outline"
          size="sm"
          disabled={isLoading}
        >
          {isOpen ? 'Hide' : 'Link Images'}
        </Button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Linked Images Display */}
      {linkedImages.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {linkedImages.map((image) => (
            <motion.div
              key={image.id}
              className="relative bg-white rounded-lg shadow-md overflow-hidden"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="aspect-[4/3] bg-gray-100 overflow-hidden">
                <img
                  src={image.url}
                  alt={image.title}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-3">
                <h4 className="font-medium text-sm text-gray-900 truncate">
                  {image.title}
                </h4>
                {image.description && (
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                    {image.description}
                  </p>
                )}
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-gray-400">
                    Linked {new Date(image.linkedAt).toLocaleDateString()}
                  </span>
                  <Button
                    onClick={() => unlinkImage(image.id)}
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:text-red-700"
                    disabled={isLoading}
                  >
                    Unlink
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* No Linked Images Message */}
      {linkedImages.length === 0 && !isLoading && (
        <div className="text-center py-8 text-gray-500">
          <p>No gallery images linked to this MOC yet.</p>
          <p className="text-sm mt-1">Click "Link Images" to add inspiration images.</p>
        </div>
      )}

      {/* Image Selection Modal */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
          >
            <motion.div
              className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[80vh] overflow-hidden"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold">Link Gallery Images</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Select images from your gallery to link to this MOC
                </p>
              </div>

              {/* Modal Content */}
              <div className="p-6 overflow-y-auto max-h-[60vh]">
                {unlinkedImages.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {unlinkedImages.map((image) => (
                      <motion.div
                        key={image.id}
                        className="relative bg-white rounded-lg shadow-md overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
                        whileHover={{ y: -2 }}
                        onClick={() => linkImage(image.id)}
                      >
                        <div className="aspect-[4/3] bg-gray-100 overflow-hidden">
                          <img
                            src={image.url}
                            alt={image.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="p-3">
                          <h4 className="font-medium text-sm text-gray-900 truncate">
                            {image.title}
                          </h4>
                          {image.description && (
                            <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                              {image.description}
                            </p>
                          )}
                          {image.tags && image.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {image.tags.slice(0, 2).map((tag, index) => (
                                <span
                                  key={index}
                                  className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                                >
                                  {tag}
                                </span>
                              ))}
                              {image.tags.length > 2 && (
                                <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                                  +{image.tags.length - 2}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <p>No available images to link.</p>
                    <p className="text-sm mt-1">
                      Upload some images to your gallery first.
                    </p>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t border-gray-200 flex justify-end">
                <Button
                  onClick={() => setIsOpen(false)}
                  variant="outline"
                >
                  Close
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GalleryImageLinker; 