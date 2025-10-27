import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@repo/ui'
import { Image, Heart, Download, Share2 } from 'lucide-react'

export const InspirationGalleryTab: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
          Inspiration Gallery
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Discover and save inspiring LEGO builds and designs.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center space-x-2">
              <Image className="h-5 w-5 text-blue-600" />
              <CardTitle className="text-lg">Saved Images</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Images you've saved for inspiration.
            </p>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-blue-600">47</span>
              <span className="text-sm text-gray-500">Images</span>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center space-x-2">
              <Heart className="h-5 w-5 text-red-600" />
              <CardTitle className="text-lg">Favorites</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Your most loved inspirational builds.
            </p>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-red-600">12</span>
              <span className="text-sm text-gray-500">Favorites</span>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center space-x-2">
              <Download className="h-5 w-5 text-green-600" />
              <CardTitle className="text-lg">Collections</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Organized collections of inspiration.
            </p>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-green-600">8</span>
              <span className="text-sm text-gray-500">Collections</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Recent Inspiration</span>
            <button className="flex items-center space-x-2 px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
              <Share2 className="h-4 w-4" />
              <span className="text-sm">Share</span>
            </button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="relative group">
              <div className="aspect-square bg-gradient-to-br from-blue-400 to-purple-600 rounded-lg flex items-center justify-center">
                <Image className="h-8 w-8 text-white" />
              </div>
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 rounded-lg flex items-center justify-center">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex space-x-2">
                  <button className="p-2 bg-white rounded-full hover:bg-gray-100">
                    <Heart className="h-4 w-4 text-red-500" />
                  </button>
                  <button className="p-2 bg-white rounded-full hover:bg-gray-100">
                    <Download className="h-4 w-4 text-blue-500" />
                  </button>
                </div>
              </div>
              <p className="text-sm font-medium mt-2">Modular Building</p>
              <p className="text-xs text-gray-500">2 days ago</p>
            </div>

            <div className="relative group">
              <div className="aspect-square bg-gradient-to-br from-green-400 to-blue-600 rounded-lg flex items-center justify-center">
                <Image className="h-8 w-8 text-white" />
              </div>
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 rounded-lg flex items-center justify-center">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex space-x-2">
                  <button className="p-2 bg-white rounded-full hover:bg-gray-100">
                    <Heart className="h-4 w-4 text-red-500" />
                  </button>
                  <button className="p-2 bg-white rounded-full hover:bg-gray-100">
                    <Download className="h-4 w-4 text-blue-500" />
                  </button>
                </div>
              </div>
              <p className="text-sm font-medium mt-2">Technic Design</p>
              <p className="text-xs text-gray-500">1 week ago</p>
            </div>

            <div className="relative group">
              <div className="aspect-square bg-gradient-to-br from-purple-400 to-pink-600 rounded-lg flex items-center justify-center">
                <Image className="h-8 w-8 text-white" />
              </div>
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 rounded-lg flex items-center justify-center">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex space-x-2">
                  <button className="p-2 bg-white rounded-full hover:bg-gray-100">
                    <Heart className="h-4 w-4 text-red-500" />
                  </button>
                  <button className="p-2 bg-white rounded-full hover:bg-gray-100">
                    <Download className="h-4 w-4 text-blue-500" />
                  </button>
                </div>
              </div>
              <p className="text-sm font-medium mt-2">City Layout</p>
              <p className="text-xs text-gray-500">2 weeks ago</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
