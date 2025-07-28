import React, { useState } from 'react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import InfiniteGallery from './index.js';
import { galleryApi } from '../../store/galleryApi.js';
import type { GalleryFilters } from '../../store/galleryApi.js';

// Create a test store for the example
const createExampleStore = () => {
  return configureStore({
    reducer: {
      [galleryApi.reducerPath]: galleryApi.reducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(galleryApi.middleware),
  });
};

const InfiniteGalleryExample: React.FC = () => {
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [filters, setFilters] = useState<Partial<GalleryFilters>>({
    type: 'image',
  });

  const handleImageClick = (image: any) => {
    console.log('Image clicked:', image);
  };

  const handleImageLike = (imageId: string, liked: boolean) => {
    console.log('Image liked:', imageId, liked);
  };

  const handleImageShare = (imageId: string) => {
    console.log('Image shared:', imageId);
  };

  const handleImageDelete = (imageId: string) => {
    console.log('Image deleted:', imageId);
  };

  const handleImageDownload = (imageId: string) => {
    console.log('Image downloaded:', imageId);
  };

  const handleImageAddToAlbum = (imageId: string) => {
    console.log('Image added to album:', imageId);
  };

  const handleImagesSelected = (imageIds: string[]) => {
    setSelectedImages(imageIds);
    console.log('Selected images:', imageIds);
  };

  const handleFilterChange = (newFilters: Partial<GalleryFilters>) => {
    setFilters(newFilters);
  };

  return (
    <Provider store={createExampleStore()}>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Infinite Gallery Example
          </h1>
          <p className="text-gray-600 mb-6">
            This example demonstrates the infinite scroll functionality with IntersectionObserver.
            Scroll down to automatically load more images.
          </p>

          {/* Filter Controls */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-lg font-semibold mb-3">Filters</h3>
            <div className="flex flex-wrap gap-4">
              <button
                onClick={() => handleFilterChange({ type: 'image' })}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  filters.type === 'image'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                Images Only
              </button>
              <button
                onClick={() => handleFilterChange({ type: 'album' })}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  filters.type === 'album'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                Albums Only
              </button>
              <button
                onClick={() => handleFilterChange({ type: 'all' })}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  filters.type === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                All Items
              </button>
            </div>
          </div>

          {/* Selected Images Info */}
          {selectedImages.length > 0 && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="text-lg font-semibold text-blue-900 mb-2">
                Selected Images ({selectedImages.length})
              </h3>
              <p className="text-blue-700">
                Selected IDs: {selectedImages.join(', ')}
              </p>
            </div>
          )}
        </div>

        {/* Infinite Gallery */}
        <InfiniteGallery
          initialFilters={filters}
          pageSize={12}
          onImageClick={handleImageClick}
          onImageLike={handleImageLike}
          onImageShare={handleImageShare}
          onImageDelete={handleImageDelete}
          onImageDownload={handleImageDownload}
          onImageAddToAlbum={handleImageAddToAlbum}
          onImagesSelected={handleImagesSelected}
          selectedImages={selectedImages}
          columns={{ sm: 2, md: 3, lg: 4, xl: 5 }}
          gap={6}
          className="bg-white rounded-lg shadow-lg p-6"
        />

        {/* Usage Instructions */}
        <div className="mt-12 p-6 bg-gray-50 rounded-lg">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">
            How to Use
          </h3>
          <div className="space-y-4 text-gray-700">
            <div>
              <h4 className="font-semibold">Basic Usage:</h4>
              <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto">
                {`import { InfiniteGallery } from '@repo/gallery';

<InfiniteGallery
  initialFilters={{ type: 'image' }}
  pageSize={20}
  onImageClick={(image) => console.log(image)}
/>`}
              </pre>
            </div>
            
            <div>
              <h4 className="font-semibold">With Custom Filters:</h4>
              <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto">
                {`<InfiniteGallery
  initialFilters={{
    type: 'image',
    tag: 'nature',
    search: 'landscape'
  }}
  pageSize={12}
/>`}
              </pre>
            </div>

            <div>
              <h4 className="font-semibold">With Selection:</h4>
              <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto">
                {`const [selectedImages, setSelectedImages] = useState([]);

<InfiniteGallery
  onImagesSelected={setSelectedImages}
  selectedImages={selectedImages}
/>`}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </Provider>
  );
};

export default InfiniteGalleryExample; 