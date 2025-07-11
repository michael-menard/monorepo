import { Outlet } from 'react-router-dom';

export default function ProfileLayout() {
  return (
    <div className="profile-layout min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex">
          {/* Sidebar */}
          <div className="w-64 flex-shrink-0">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center mb-6">
                <div className="h-12 w-12 bg-indigo-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-medium">JD</span>
                </div>
                <div className="ml-3">
                  <h3 className="text-lg font-medium text-gray-900">John Doe</h3>
                  <p className="text-sm text-gray-500">@john_doe</p>
                </div>
              </div>
              
              <nav className="space-y-2">
                <a href="/profile" className="block px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50">
                  Overview
                </a>
                <a href="/profile/settings" className="block px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50">
                  Settings
                </a>
                <a href="/profile/collections" className="block px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50">
                  My Collections
                </a>
                <a href="/profile/history" className="block px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50">
                  Activity History
                </a>
              </nav>
            </div>
          </div>
          
          {/* Main content */}
          <div className="flex-1 ml-8">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
} 