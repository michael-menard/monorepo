import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@repo/ui';
import { Heart, ShoppingCart, Star, Plus } from 'lucide-react';

export const WishlistTab: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
          Wishlist
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Track your desired LEGO sets and building materials.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center space-x-2">
              <Heart className="h-5 w-5 text-red-600" />
              <CardTitle className="text-lg">Wishlist Items</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Total items in your wishlist.
            </p>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-red-600">24</span>
              <span className="text-sm text-gray-500">Items</span>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center space-x-2">
              <ShoppingCart className="h-5 w-5 text-green-600" />
              <CardTitle className="text-lg">Purchased</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Items you've acquired from your wishlist.
            </p>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-green-600">8</span>
              <span className="text-sm text-gray-500">Acquired</span>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center space-x-2">
              <Star className="h-5 w-5 text-yellow-600" />
              <CardTitle className="text-lg">Priority</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              High priority wishlist items.
            </p>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-yellow-600">5</span>
              <span className="text-sm text-gray-500">Priority</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Recent Wishlist Activity</span>
            <button className="flex items-center space-x-2 px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
              <Plus className="h-4 w-4" />
              <span className="text-sm">Add Item</span>
            </button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium">Added "LEGO Technic Ferrari Daytona SP3"</p>
                <p className="text-xs text-gray-500">Priority: High • 1 day ago</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium">Purchased "LEGO Ideas Tree House"</p>
                <p className="text-xs text-gray-500">Moved to collection • 3 days ago</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium">Added "LEGO Architecture Empire State Building"</p>
                <p className="text-xs text-gray-500">Priority: Medium • 1 week ago</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}; 