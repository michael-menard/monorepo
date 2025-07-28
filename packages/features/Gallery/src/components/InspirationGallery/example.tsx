import React, { useState, useCallback } from 'react';
import InspirationGallery from './index.js';
import type { GalleryImage } from '../../types/index.js';

// Example usage of InspirationGallery component
const InspirationGalleryExample: React.FC = () => {
  const [images, setImages] = useState<GalleryImage[]>([
    {
      id: '1',
      url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop',
      title: 'Mountain Landscape',
      description: 'Beautiful mountain landscape with snow-capped peaks',
      author: 'John Doe',
      tags: ['nature', 'mountains', 'landscape'],
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    },
    {
      id: '2',
      url: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400&h=500&fit=crop',
      title: 'Forest Path',
      description: 'Peaceful forest path leading through tall trees',
      author: 'Jane Smith',
      tags: ['nature', 'forest', 'path'],
      createdAt: new Date('2024-01-02'),
      updatedAt: new Date('2024-01-02'),
    },
    {
      id: '3',
      url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=400&fit=crop',
      title: 'Ocean Waves',
      description: 'Crashing ocean waves against rocky coastline',
      author: 'Mike Johnson',
      tags: ['nature', 'ocean', 'waves'],
      createdAt: new Date('2024-01-03'),
      updatedAt: new Date('2024-01-03'),
    },
    {
      id: '4',
      url: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400&h=600&fit=crop',
      title: 'Sunset Sky',
      description: 'Vibrant sunset colors painting the sky',
      author: 'Sarah Wilson',
      tags: ['nature', 'sunset', 'sky'],
      createdAt: new Date('2024-01-04'),
      updatedAt: new Date('2024-01-04'),
    },
    {
      id: '5',
      url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=350&fit=crop',
      title: 'Desert Dunes',
      description: 'Rolling sand dunes in the desert landscape',
      author: 'Alex Brown',
      tags: ['nature', 'desert', 'sand'],
      createdAt: new Date('2024-01-05'),
      updatedAt: new Date('2024-01-05'),
    },
  ]);

  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // Example handlers
  const handleImageClick = useCallback((image: GalleryImage) => {
    console.log('Image clicked:', image.title);
    // Open lightbox or navigate to detail view
  }, []);

  const handleImageLike = useCallback((imageId: string, liked: boolean) => {
    console.log('Image liked:', imageId, liked);
    // Update like status in backend
  }, []);

  const handleImageShare = useCallback((imageId: string) => {
    console.log('Image shared:', imageId);
    // Open share dialog
  }, []);

  const handleImageDelete = useCallback((imageId: string) => {
    console.log('Image deleted:', imageId);
    setImages((prev) => prev.filter((img) => img.id !== imageId));
  }, []);

  const handleImageDownload = useCallback((imageId: string) => {
    console.log('Image downloaded:', imageId);
    // Trigger download
  }, []);

  const handleImageAddToAlbum = useCallback((imageId: string) => {
    console.log('Image added to album:', imageId);
    // Open album selection dialog
  }, []);

  // Simulate loading more images
  const handleLoadMore = useCallback(async () => {
    if (loading || !hasMore) return;

    setLoading(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Add more images
    const newImages: GalleryImage[] = [
      {
        id: `${images.length + 1}`,
        url: `https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=${300 + Math.random() * 300}&fit=crop`,
        title: `New Image ${images.length + 1}`,
        description: `Description for new image ${images.length + 1}`,
        author: 'New Author',
        tags: ['new', 'inspiration'],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    setImages((prev) => [...prev, ...newImages]);

    // Stop loading more after 10 images
    if (images.length + newImages.length >= 10) {
      setHasMore(false);
    }

    setLoading(false);
  }, [images.length, loading, hasMore]);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Inspiration Gallery Example
        </h1>
        <p className="text-gray-600">
          This example demonstrates the InspirationGallery component with masonry layout,
          infinite scroll, and responsive design.
        </p>
      </div>

      {/* Basic Usage */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">Basic Gallery</h2>
        <InspirationGallery
          images={images}
          onImageClick={handleImageClick}
          onImageLike={handleImageLike}
          onImageShare={handleImageShare}
          onImageDelete={handleImageDelete}
          onImageDownload={handleImageDownload}
          onImageAddToAlbum={handleImageAddToAlbum}
          onLoadMore={handleLoadMore}
          hasMore={hasMore}
          loading={loading}
        />
      </div>

      {/* Custom Configuration */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">Custom Configuration</h2>
        <InspirationGallery
          images={images.slice(0, 3)} // Show only first 3 images
          columns={{ sm: 1, md: 2, lg: 3, xl: 3 }}
          gap={6}
          className="border-2 border-gray-200 rounded-lg p-4"
          onImageClick={handleImageClick}
          onImageLike={handleImageLike}
          onImageShare={handleImageShare}
          onImageDelete={handleImageDelete}
          onImageDownload={handleImageDownload}
          onImageAddToAlbum={handleImageAddToAlbum}
        />
      </div>

      {/* Compact Layout */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">Compact Layout</h2>
        <InspirationGallery
          images={images.slice(0, 4)}
          columns={{ sm: 2, md: 3, lg: 4, xl: 5 }}
          gap={2}
          className="bg-gray-50 p-4 rounded-lg"
          onImageClick={handleImageClick}
          onImageLike={handleImageLike}
          onImageShare={handleImageShare}
          onImageDelete={handleImageDelete}
          onImageDownload={handleImageDownload}
          onImageAddToAlbum={handleImageAddToAlbum}
        />
      </div>
    </div>
  );
};

export default InspirationGalleryExample; 