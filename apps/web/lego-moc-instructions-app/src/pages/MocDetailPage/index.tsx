import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import { Button } from '@repo/ui';
import { ArrowLeft, Download, Heart, Plus, Share, Upload } from 'lucide-react';
import {
  calculateTotalParts,
  calculateTotalTime,
  formatDate,
  formatTime,
  getDifficultyLabel,
} from '@repo/moc-instructions';
import { Gallery } from '@repo/gallery';
import type { GalleryImage } from '@repo/gallery';
import { Upload as FileUpload } from '@monorepo/upload';

// Mock data for development/testing when API is not available
const mockInstruction = {
  id: 'test-id',
  title: 'Amazing Space Station MOC',
  description: 'A stunning space station design that showcases advanced building techniques and creative design. This MOC features multiple modules, detailed interiors, and realistic space station elements.',
  author: 'Space Builder Pro',
  category: 'space',
  difficulty: 'intermediate' as const,
  tags: ['space', 'station', 'futuristic', 'advanced'],
  coverImageUrl: 'https://via.placeholder.com/800x400/4F46E5/FFFFFF?text=Space+Station+MOC',
  steps: [
    {
      id: 'step-1',
      instructionsId: 'test-id',
      stepNumber: 1,
      title: 'Base Structure',
      description: 'Start with the central core structure using 2x4 bricks',
      difficulty: 'easy' as const,
      estimatedTime: 30,
      imageUrl: 'https://via.placeholder.com/400x300/4F46E5/FFFFFF?text=Step+1',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'step-2',
      instructionsId: 'test-id',
      stepNumber: 2,
      title: 'Solar Panels',
      description: 'Add the solar panel arrays to the sides',
      difficulty: 'medium' as const,
      estimatedTime: 45,
      imageUrl: 'https://via.placeholder.com/400x300/059669/FFFFFF?text=Step+2',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'step-3',
      instructionsId: 'test-id',
      stepNumber: 3,
      title: 'Command Module',
      description: 'Build the command module with detailed interior',
      difficulty: 'hard' as const,
      estimatedTime: 60,
      imageUrl: 'https://via.placeholder.com/400x300/DC2626/FFFFFF?text=Step+3',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ],
  partsList: [
    { partNumber: '3001', quantity: 50, color: 'white', description: '2x4 brick' },
    { partNumber: '3002', quantity: 30, color: 'gray', description: '2x3 brick' },
    { partNumber: '3003', quantity: 20, color: 'black', description: '2x2 brick' },
    { partNumber: '3024', quantity: 15, color: 'transparent', description: '1x1 brick' },
    { partNumber: '3069', quantity: 10, color: 'blue', description: '1x2 brick' },
  ],
  isPublic: true,
  isPublished: true,
  rating: 4.8,
  downloadCount: 1250,
  createdAt: new Date('2024-01-15'),
  updatedAt: new Date('2024-01-20'),
};

// Convert step images to gallery format
const convertStepsToGalleryImages = (steps: typeof mockInstruction.steps): Array<GalleryImage> => {
  return steps
    .filter(step => step.imageUrl)
    .map((step) => ({
      id: step.id,
      url: step.imageUrl,
      title: `Step ${step.stepNumber}: ${step.title}`,
      description: step.description,
      author: mockInstruction.author,
      tags: [step.difficulty, `step-${step.stepNumber}`],
      createdAt: step.createdAt,
      updatedAt: step.updatedAt,
    }));
};

export const MocDetailPage: React.FC = (): React.JSX.Element => {
  const { id } = useParams({ from: '/moc-detail/$id' });
  const navigate = useNavigate();
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(89);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [galleryImages, setGalleryImages] = useState<Array<GalleryImage>>(() => 
    convertStepsToGalleryImages(mockInstruction.steps)
  );
  const [selectedImages, setSelectedImages] = useState<Array<string>>([]);

  // For testing, always use mock data
  const instruction = mockInstruction;

  // Update document title
  useEffect(() => {
    document.title = `${instruction.title} - MOC Details`;
  }, [instruction.title]);

  const handleBack = () => {
    navigate({ to: '/moc-gallery' });
  };

  const handleLike = () => {
    setIsLiked(!isLiked);
    setLikeCount(isLiked ? likeCount - 1 : likeCount + 1);
  };

  const handleShare = async () => {
    await navigator.clipboard.writeText(window.location.href);
    // Show toast notification
    console.log('Link copied to clipboard');
  };

  const handleDownload = () => {
    console.log('Downloading instructions for:', id);
    // Implement download functionality using the download service from @repo/moc-instructions
  };

  // Gallery event handlers
  const handleImageClick = (image: any) => {
    console.log('Image clicked:', image);
    // Could open a modal or navigate to image detail
  };

  const handleImageLike = (imageId: string, liked: boolean) => {
    console.log('Image liked:', imageId, liked);
    // Update image like status
  };

  const handleImageShare = (imageId: string) => {
    console.log('Image shared:', imageId);
    // Share image functionality
  };

  const handleImageDelete = (imageId: string) => {
    console.log('Image deleted:', imageId);
    setGalleryImages(prev => prev.filter(img => img.id !== imageId));
  };

  const handleImageDownload = (imageId: string) => {
    console.log('Image downloaded:', imageId);
    // Download image functionality
  };

  const handleImagesSelected = (imageIds: Array<string>) => {
    setSelectedImages(imageIds);
  };

  // File upload handlers
  const handleFileUpload = async (files: File | Array<File>, metadata?: Record<string, any>) => {
    console.log('Files uploaded:', files, metadata);
    
    // Convert uploaded files to gallery images
    const fileArray = Array.isArray(files) ? files : [files];
    const newImages: Array<GalleryImage> = fileArray.map((file, index) => ({
      id: `uploaded-${Date.now()}-${index}`,
      url: URL.createObjectURL(file),
      title: metadata?.title || file.name,
      description: metadata?.description || `Uploaded image for ${instruction.title}`,
      author: instruction.author,
      tags: metadata?.tags ? metadata.tags.split(',').map((tag: string) => tag.trim()) : ['uploaded'],
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    setGalleryImages(prev => [...prev, ...newImages]);
    setShowUploadModal(false);
  };

  const handleUploadError = (error: string) => {
    console.error('Upload error:', error);
    // Show error notification
  };

  return (
    <div className="container mx-auto px-4 py-8" data-testid="moc-detail-page">
      {/* Header */}
      <div className="mb-8">
              <Button
                variant="ghost"
          onClick={handleBack}
          className="mb-4 flex items-center gap-2"
              >
          <ArrowLeft className="h-4 w-4" />
          Back to Gallery
              </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Image */}
          <div className="lg:col-span-2">
            <img
              src={instruction.coverImageUrl || 'https://via.placeholder.com/800x400/4F46E5/FFFFFF?text=No+Image'}
              alt={instruction.title}
              className="w-full h-64 lg:h-96 object-cover rounded-lg shadow-lg"
              data-testid="moc-main-image"
            />
            </div>

          {/* MOC Info */}
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2" data-testid="moc-title">
                {instruction.title}
              </h1>
              <p className="text-gray-600 mb-4" data-testid="moc-description">
                {instruction.description}
              </p>
              </div>

            {/* Author and Metadata */}
            <div className="space-y-3">
              <div className="flex items-center gap-2" data-testid="moc-author">
                <span className="text-sm text-gray-500">By</span>
                <span className="font-medium text-gray-900">{instruction.author}</span>
              </div>
              
              <div className="flex items-center gap-4 text-sm">
                <span className="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded" data-testid="moc-difficulty">
                  {getDifficultyLabel(instruction.difficulty)}
                </span>
                <span className="text-gray-500" data-testid="moc-pieces">
                  {calculateTotalParts(instruction)} pieces
                </span>
                <span className="text-gray-500">
                  {formatTime(calculateTotalTime(instruction))}
                </span>
              </div>

              {/* Rating and Downloads */}
              <div className="flex items-center gap-4 text-sm">
                {instruction.rating && (
                  <span className="flex items-center gap-1">
                    <span className="text-yellow-500">★</span>
                    <span>{instruction.rating}/5</span>
                  </span>
                )}
                <span className="text-gray-500">{instruction.downloadCount} downloads</span>
              </div>
            </div>

            {/* Tags */}
              <div className="flex flex-wrap gap-2">
              {instruction.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-block bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded"
                >
                    {tag}
                </span>
                ))}
              </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2">
              <Button
                variant={isLiked ? "default" : "outline"}
                size="sm"
                onClick={handleLike}
                className="flex items-center gap-2"
              >
                <Heart className={`h-4 w-4 ${isLiked ? 'fill-current' : ''}`} />
                {likeCount}
              </Button>
              
                      <Button
                        variant="outline"
                        size="sm"
                onClick={handleShare}
                className="flex items-center gap-2"
                      >
                <Share className="h-4 w-4" />
                Share
                      </Button>
              
                      <Button
                        variant="outline"
                        size="sm"
                onClick={handleDownload}
                className="flex items-center gap-2"
                      >
                <Download className="h-4 w-4" />
                        Download
                      </Button>
                    </div>
                  </div>
              </div>
          </div>
          
      {/* Content Sections */}
      <div className="space-y-8">
        {/* Overview Section */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold">About this MOC</h2>
          <p className="text-gray-600 leading-relaxed">{instruction.description}</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Statistics</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Total Pieces:</span>
                  <span className="font-medium">{calculateTotalParts(instruction)}</span>
                  </div>
                <div className="flex justify-between">
                  <span>Build Time:</span>
                  <span className="font-medium">{formatTime(calculateTotalTime(instruction))}</span>
                </div>
                <div className="flex justify-between">
                  <span>Difficulty:</span>
                  <span className="font-medium">{getDifficultyLabel(instruction.difficulty)}</span>
                    </div>
                {instruction.rating && (
                  <div className="flex justify-between">
                    <span>Rating:</span>
                    <span className="font-medium">{instruction.rating}/5</span>
                  </div>
            )}
          </div>
        </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Category:</span>
                  <span className="font-medium capitalize">{instruction.category}</span>
        </div>
                <div className="flex justify-between">
                  <span>Downloads:</span>
                  <span className="font-medium">{instruction.downloadCount}</span>
            </div>
                <div className="flex justify-between">
                  <span>Likes:</span>
                  <span className="font-medium">{likeCount}</span>
                </div>
                <div className="flex justify-between">
                  <span>Created:</span>
                  <span className="font-medium">{formatDate(instruction.createdAt)}</span>
              </div>
        </div>
      </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {instruction.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-block bg-white text-gray-700 text-xs px-2 py-1 rounded border"
                  >
                    {tag}
                    </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Instructions Section */}
        <section className="space-y-6" data-testid="instructions">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Build Steps</h2>
            <Button className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Upload Instructions
                </Button>
            </div>

          <div className="space-y-6">
            {instruction.steps.map((step) => (
              <div
                key={step.id}
                className="border rounded-lg p-6"
                data-testid="instruction-step"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-2">
                      Step {step.stepNumber}: {step.title}
                    </h3>
                    <p className="text-gray-600 mb-4">{step.description}</p>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>Difficulty: {getDifficultyLabel(step.difficulty)}</span>
                      {step.estimatedTime && (
                        <span>Time: {formatTime(step.estimatedTime)}</span>
                      )}
            </div>
          </div>
                  {step.imageUrl && (
                    <div>
                      <img
                        src={step.imageUrl}
                        alt={`Step ${step.stepNumber}`}
                        className="w-full h-48 object-cover rounded-lg"
                      />
            </div>
                  )}
            </div>
            </div>
            ))}
          </div>
        </section>

        {/* Parts List Section */}
        <section className="space-y-6" data-testid="parts-list">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Required Parts</h2>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Part
                          </Button>
                      </div>

          <div className="bg-white border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Part Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Color
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quantity
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {instruction.partsList.map((part, index) => (
                  <tr key={index} data-testid="part-item">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {part.partNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {part.description}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className="capitalize">{part.color}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {part.quantity}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
                      </div>
        </section>

        {/* Gallery Section */}
        <section className="space-y-6" data-testid="moc-gallery">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Images</h2>
            <Button 
              className="flex items-center gap-2"
              onClick={() => setShowUploadModal(true)}
            >
              <Upload className="h-4 w-4" />
              Upload Image
            </Button>
          </div>

          {/* Gallery Component */}
          <div className="bg-white border rounded-lg p-6">
            <Gallery
              images={galleryImages}
              layout="grid"
              className="grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
              selectedImages={selectedImages}
              onImageClick={handleImageClick}
              onImageLike={handleImageLike}
              onImageShare={handleImageShare}
              onImageDelete={handleImageDelete}
              onImageDownload={handleImageDownload}
              onImagesSelected={handleImagesSelected}
            />
          </div>
        </section>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Upload Images for {instruction.title}</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowUploadModal(false)}
              >
                ✕
              </Button>
            </div>
            
            <FileUpload
              accept="image/*"
              multiple={true}
              maxSizeMB={10}
              onUpload={handleFileUpload}
              onError={handleUploadError}
              metadataFields={[
                {
                  name: 'title',
                  label: 'Image Title',
                  type: 'text',
                  required: true,
                },
                {
                  name: 'description',
                  label: 'Description',
                  type: 'text',
                  required: false,
                },
                {
                  name: 'tags',
                  label: 'Tags (comma-separated)',
                  type: 'text',
                  required: false,
                },
              ]}
              uploadButtonLabel="Upload to MOC Gallery"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default MocDetailPage; 