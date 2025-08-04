import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { z } from 'zod';
import { Button, Input, Label } from '@repo/ui';

// Zod schemas for type safety
const MocSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  createdAt: z.string(),
});

const GalleryImageLinkModalPropsSchema = z.object({
  imageId: z.string(),
  imageTitle: z.string(),
  isOpen: z.boolean(),
  onClose: z.function().args().returns(z.void()),
  onImageLinked: z.function().args(z.string(), z.string()).returns(z.void()).optional(),
  className: z.string().optional(),
});

export type Moc = z.infer<typeof MocSchema>;
export type GalleryImageLinkModalProps = z.infer<typeof GalleryImageLinkModalPropsSchema>;

export const GalleryImageLinkModal: React.FC<GalleryImageLinkModalProps> = ({
  imageId,
  imageTitle,
  isOpen,
  onClose,
  onImageLinked,
  className = '',
}) => {
  const [mocs, setMocs] = useState<Moc[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [linkingMocId, setLinkingMocId] = useState<string | null>(null);

  // Fetch user's MOCs
  const fetchMocs = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch('/api/mocs/search?limit=50', {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch MOCs');
      }
      
      const data = await response.json();
      setMocs(data.mocs || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch MOCs');
    } finally {
      setIsLoading(false);
    }
  };

  // Link image to MOC
  const linkImageToMoc = async (mocId: string) => {
    try {
      setLinkingMocId(mocId);
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
        throw new Error('Failed to link image to MOC');
      }
      
      onImageLinked?.(imageId, mocId);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to link image to MOC');
    } finally {
      setLinkingMocId(null);
    }
  };

  // Load MOCs when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchMocs();
    }
  }, [isOpen]);

  // Filter MOCs based on search term
  const filteredMocs = mocs.filter((moc) =>
    moc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (moc.description && moc.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold">Link Image to MOC</h2>
              <p className="text-sm text-gray-600 mt-1">
                Select a MOC to link "{imageTitle}" to
              </p>
            </div>

            {/* Search Input */}
            <div className="p-6 border-b border-gray-200">
              <Label htmlFor="moc-search">Search MOCs</Label>
              <Input
                id="moc-search"
                type="text"
                placeholder="Search by title or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="mt-2"
              />
            </div>

            {/* Error Display */}
            {error && (
              <div className="p-4 bg-red-50 border border-red-200">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {isLoading ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">Loading MOCs...</p>
                </div>
              ) : filteredMocs.length > 0 ? (
                <div className="space-y-3">
                  {filteredMocs.map((moc) => (
                    <motion.div
                      key={moc.id}
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                      whileHover={{ scale: 1.01 }}
                    >
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{moc.title}</h3>
                        {moc.description && (
                          <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                            {moc.description}
                          </p>
                        )}
                        <p className="text-xs text-gray-400 mt-1">
                          Created {new Date(moc.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Button
                        onClick={() => linkImageToMoc(moc.id)}
                        disabled={linkingMocId === moc.id}
                        size="sm"
                        className="ml-4"
                      >
                        {linkingMocId === moc.id ? 'Linking...' : 'Link'}
                      </Button>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  {searchTerm ? (
                    <>
                      <p>No MOCs found matching "{searchTerm}"</p>
                      <p className="text-sm mt-1">Try a different search term</p>
                    </>
                  ) : (
                    <>
                      <p>No MOCs found</p>
                      <p className="text-sm mt-1">Create a MOC first to link images</p>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-gray-200 flex justify-end">
              <Button
                onClick={onClose}
                variant="outline"
              >
                Cancel
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default GalleryImageLinkModal; 