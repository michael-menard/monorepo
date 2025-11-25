import React, { useState } from 'react'
import { Gallery } from '../../index.js'
import type { GalleryImage } from '../../types/index.js'

const BatchOperationsExample: React.FC = () => {
  const [selectedImages, setSelectedImages] = useState<string[]>([])

  // Mock gallery data
  const mockImages: GalleryImage[] = [
    {
      id: '1',
      url: 'https://picsum.photos/400/300?random=1',
      title: 'Beautiful Landscape',
      description: 'A stunning landscape photograph',
      author: 'John Doe',
      createdAt: new Date('2024-01-15T10:30:00Z'),
      updatedAt: new Date('2024-01-15T10:30:00Z'),
      tags: ['landscape', 'nature', 'photography'],
    },
    {
      id: '2',
      url: 'https://picsum.photos/400/300?random=2',
      title: 'Urban Architecture',
      description: 'Modern city architecture',
      author: 'Jane Smith',
      createdAt: new Date('2024-01-16T14:20:00Z'),
      updatedAt: new Date('2024-01-16T14:20:00Z'),
      tags: ['architecture', 'urban', 'city'],
    },
    {
      id: '3',
      url: 'https://picsum.photos/400/300?random=3',
      title: 'Abstract Art',
      description: 'Colorful abstract composition',
      author: 'Bob Johnson',
      createdAt: '2024-01-17T09:15:00Z',
      tags: ['abstract', 'art', 'colorful'],
    },
    {
      id: '4',
      url: 'https://picsum.photos/400/300?random=4',
      title: 'Portrait Photography',
      description: 'Professional portrait shot',
      author: 'Alice Brown',
      createdAt: '2024-01-18T16:45:00Z',
      tags: ['portrait', 'people', 'professional'],
    },
    {
      id: '5',
      url: 'https://picsum.photos/400/300?random=5',
      title: 'Wildlife Photography',
      description: 'Amazing wildlife capture',
      author: 'Charlie Wilson',
      createdAt: '2024-01-19T11:30:00Z',
      tags: ['wildlife', 'nature', 'animals'],
    },
    {
      id: '6',
      url: 'https://picsum.photos/400/300?random=6',
      title: 'Street Photography',
      description: 'Candid street moment',
      author: 'Diana Davis',
      createdAt: '2024-01-20T13:20:00Z',
      tags: ['street', 'candid', 'urban'],
    },
  ]

  const handleImagesSelected = (imageIds: string[]) => {
    setSelectedImages(imageIds)
    console.log('Selected images:', imageIds)
  }

  const handleImagesDeleted = (deletedIds: string[]) => {
    console.log('Images deleted:', deletedIds)
    // In a real app, you would update the images list
    setSelectedImages([])
  }

  const handleImagesAddedToAlbum = (imageIds: string[], albumId: string) => {
    console.log('Images added to album:', imageIds, 'Album ID:', albumId)
    setSelectedImages([])
  }

  const handleImagesDownloaded = (imageIds: string[]) => {
    console.log('Images downloaded:', imageIds)
  }

  const handleImagesShared = (imageIds: string[]) => {
    console.log('Images shared:', imageIds)
  }

  const handleImageClick = (image: GalleryImage) => {
    console.log('Image clicked:', image)
  }

  const handleImageLike = (imageId: string, liked: boolean) => {
    console.log('Image liked:', imageId, 'Liked:', liked)
  }

  const handleImageShare = (imageId: string) => {
    console.log('Image shared:', imageId)
  }

  const handleImageDelete = (imageId: string) => {
    console.log('Image deleted:', imageId)
  }

  const handleImageDownload = (imageId: string) => {
    console.log('Image downloaded:', imageId)
  }

  const handleImageAddToAlbum = (imageId: string) => {
    console.log('Image added to album:', imageId)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Gallery with Batch Operations</h1>
          <p className="text-gray-600 mb-4">
            Select multiple images using the checkboxes to enable batch operations.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">Available Batch Operations:</h3>
            <ul className="text-blue-800 space-y-1">
              <li>
                • <strong>Delete:</strong> Remove multiple images at once
              </li>
              <li>
                • <strong>Add to Album:</strong> Create a new album with selected images
              </li>
              <li>
                • <strong>Download:</strong> Download all selected images
              </li>
              <li>
                • <strong>Share:</strong> Share multiple images via native share or clipboard
              </li>
            </ul>
          </div>
        </div>

        <Gallery
          images={mockImages}
          layout="grid"
          selectedImages={selectedImages}
          onImagesSelected={handleImagesSelected}
          onImageClick={handleImageClick}
          onImageLike={handleImageLike}
          onImageShare={handleImageShare}
          onImageDelete={handleImageDelete}
          onImageDownload={handleImageDownload}
          onImageAddToAlbum={handleImageAddToAlbum}
          onImagesDeleted={handleImagesDeleted}
          onImagesAddedToAlbum={handleImagesAddedToAlbum}
          onImagesDownloaded={handleImagesDownloaded}
          onImagesShared={handleImagesShared}
        />

        {/* Selection Info */}
        {selectedImages.length > 0 && (
          <div className="mt-8 bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-2">Selection Information</h3>
            <p className="text-gray-600">
              {selectedImages.length} of {mockImages.length} images selected
            </p>
            <div className="mt-2">
              <p className="text-sm text-gray-500">Selected IDs: {selectedImages.join(', ')}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default BatchOperationsExample
