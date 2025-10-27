import React, { useState } from 'react'
import { GalleryWithSearch } from '../../index'
import type { GalleryImage } from '../../schemas'

// Example usage of GalleryWithSearch component
const GalleryWithSearchExample: React.FC = () => {
  const [images] = useState<GalleryImage[]>([
    {
      id: '1',
      url: 'https://example.com/image1.jpg',
      title: 'Nature Landscape',
      description: 'Beautiful nature landscape with mountains',
      author: 'John Doe',
      tags: ['nature', 'landscape', 'outdoor', 'mountains'],
      createdAt: new Date('2023-01-01'),
      updatedAt: new Date('2023-01-01'),
    },
    {
      id: '2',
      url: 'https://example.com/image2.jpg',
      title: 'City Architecture',
      description: 'Modern city architecture and skyscrapers',
      author: 'Jane Smith',
      tags: ['city', 'architecture', 'urban', 'modern'],
      createdAt: new Date('2023-01-02'),
      updatedAt: new Date('2023-01-02'),
    },
    {
      id: '3',
      url: 'https://example.com/image3.jpg',
      title: 'Portrait Photography',
      description: 'Professional portrait photography',
      author: 'Bob Wilson',
      tags: ['portrait', 'photography', 'people', 'professional'],
      createdAt: new Date('2023-01-03'),
      updatedAt: new Date('2023-01-03'),
    },
    {
      id: '4',
      url: 'https://example.com/image4.jpg',
      title: 'Abstract Art',
      description: 'Colorful abstract art piece',
      author: 'Alice Johnson',
      tags: ['abstract', 'art', 'colorful', 'creative'],
      createdAt: new Date('2023-01-04'),
      updatedAt: new Date('2023-01-04'),
    },
  ])

  const handleImageClick = (image: GalleryImage) => {
    console.log('Image clicked:', image.title)
  }

  const handleImageLike = (imageId: string, liked: boolean) => {
    console.log('Image liked:', imageId, liked)
  }

  const handleImageDelete = (imageId: string) => {
    console.log('Image deleted:', imageId)
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Gallery with Search & Filter</h1>
        <p className="text-gray-600">
          This example demonstrates the search and filtering capabilities of the gallery component.
          You can search by title, description, author, or tags, and filter by tags and categories.
        </p>
      </div>

      <GalleryWithSearch
        images={images}
        onImageClick={handleImageClick}
        onImageLike={handleImageLike}
        onImageDelete={handleImageDelete}
        layout="grid"
        searchPlaceholder="Search images by title, description, author, or tags..."
        showFilterBar={true}
        className="bg-white rounded-lg shadow-lg p-6"
      />
    </div>
  )
}

export default GalleryWithSearchExample
