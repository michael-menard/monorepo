import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@repo/ui'
import { Gallery } from '@repo/gallery'
import { BookOpen, Download, Star, ArrowRight, Upload } from 'lucide-react'

interface MockInstruction {
  id: string
  title: string
  description: string
  author: string
  theme: 'modular' | 'Automobile' | 'ideas' | 'creator expert' | 'Lord Of The Rings' | 'city'
  tags: string[]
  coverImageUrl?: string
  rating?: number
  downloadCount: number
  createdAt: Date
  updatedAt: Date
}

interface ProfileMocInstructionsSectionProps {
  instructions: MockInstruction[]
  loading?: boolean
  limit?: number
  showViewAll?: boolean
  viewAllHref?: string
}

export const ProfileMocInstructionsSection: React.FC<ProfileMocInstructionsSectionProps> = ({
  instructions,
  loading = false,
  limit = 5,
  showViewAll = true,
  viewAllHref = '/moc-instructions',
}) => {
  const displayInstructions = limit ? instructions.slice(0, limit) : instructions

  const galleryConfig = {
    layout: 'list' as const,
    itemsPerPage: limit,
    infiniteScroll: false,
    selectable: false,
    sortable: false,
    filterConfig: {
      searchable: false,
      tagFilter: false,
      categoryFilter: false,
    },
    columns: { xs: 1, sm: 1, md: 1, lg: 1, xl: 1 },
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner':
        return 'bg-green-100 text-green-800'
      case 'intermediate':
        return 'bg-yellow-100 text-yellow-800'
      case 'advanced':
        return 'bg-orange-100 text-orange-800'
      case 'expert':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const renderMocInstructionItem = (item: any) => {
    const originalInstruction = item.originalData as MockInstruction

    return (
      <div className="flex items-center space-x-4 p-4 bg-white dark:bg-gray-800 rounded-lg border hover:shadow-md transition-shadow">
        <img src={item.imageUrl} alt={item.title} className="w-16 h-16 object-cover rounded-lg" />
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-gray-900 dark:text-gray-100 truncate">{item.title}</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 truncate">{item.description}</p>
          <div className="flex items-center space-x-4 mt-2">
            <span
              className={`px-2 py-1 text-xs rounded-full ${getDifficultyColor(originalInstruction.difficulty)}`}
            >
              {originalInstruction.difficulty}
            </span>
            <span className="text-sm text-gray-500">{originalInstruction.category}</span>
            {originalInstruction.rating ? (
              <div className="flex items-center space-x-1">
                <Star className="h-3 w-3 text-yellow-500 fill-current" />
                <span className="text-sm text-gray-600">
                  {originalInstruction.rating.toFixed(1)}
                </span>
              </div>
            ) : null}
          </div>
        </div>
        <div className="flex items-center space-x-4 text-sm text-gray-500">
          <div className="flex items-center space-x-1">
            <Download className="h-4 w-4" />
            <span>{originalInstruction.downloadCount}</span>
          </div>
          <div className="text-xs">
            {new Date(originalInstruction.updatedAt).toLocaleDateString()}
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <BookOpen className="h-5 w-5 text-blue-600" />
              <CardTitle>My MOC Instructions</CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg animate-pulse"
              >
                <div className="w-16 h-16 bg-gray-200 rounded-lg"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <BookOpen className="h-5 w-5 text-blue-600" />
            <CardTitle>My MOC Instructions</CardTitle>
            <span className="text-sm text-gray-500">
              ({displayInstructions.length} instructions)
            </span>
          </div>
          {showViewAll ? (
            <a
              href={viewAllHref}
              className="flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-700 transition-colors"
            >
              <span>View All</span>
              <ArrowRight className="h-4 w-4" />
            </a>
          ) : null}
        </div>
      </CardHeader>
      <CardContent>
        {displayInstructions.length === 0 ? (
          <div className="text-center py-8">
            <Upload className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              No MOC instructions yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Share your custom builds with the community by uploading instructions.
            </p>
            <a
              href="/upload"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload Instructions
            </a>
          </div>
        ) : (
          <Gallery
            images={displayInstructions.map(instruction => ({
              id: instruction.id,
              url: instruction.coverImageUrl || '/placeholder-instruction.jpg',
              title: instruction.title,
              description: instruction.description,
              author: instruction.author,
              tags: instruction.tags,
              createdAt: instruction.createdAt,
              updatedAt: instruction.updatedAt,
            }))}
            layout="grid"
            onImageClick={image => {
              // Navigate to MOC detail page
              window.location.href = `/moc-detail/${image.id}`
            }}
            className="mt-4"
          />
        )}
      </CardContent>
    </Card>
  )
}
