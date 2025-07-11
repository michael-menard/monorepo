import { Outlet } from 'react-router-dom';

export default function InstructionsLayout() {
  return (
    <div className="instructions-layout min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex">
          {/* Sidebar */}
          <div className="w-64 flex-shrink-0">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Instructions</h3>
              <nav className="space-y-2">
                <a href="/instructions" className="block px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50">
                  All Instructions
                </a>
                <a href="/instructions/create" className="block px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50">
                  Create New
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