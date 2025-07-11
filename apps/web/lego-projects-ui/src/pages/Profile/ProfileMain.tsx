export default function ProfileMain() {
  return (
    <div className="profile-main">
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-gray-900">Profile Overview</h1>
          <p className="mt-1 text-sm text-gray-500">
            Welcome back! Here's what's happening with your Lego projects
          </p>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-indigo-50 rounded-lg p-4">
              <h3 className="text-lg font-medium text-indigo-900">Total Instructions</h3>
              <p className="text-3xl font-bold text-indigo-600">24</p>
              <p className="text-sm text-indigo-700 mt-1">+3 this month</p>
            </div>
            
            <div className="bg-green-50 rounded-lg p-4">
              <h3 className="text-lg font-medium text-green-900">Creations Shared</h3>
              <p className="text-3xl font-bold text-green-600">12</p>
              <p className="text-sm text-green-700 mt-1">+2 this week</p>
            </div>
            
            <div className="bg-yellow-50 rounded-lg p-4">
              <h3 className="text-lg font-medium text-yellow-900">Total Pieces</h3>
              <p className="text-3xl font-bold text-yellow-600">45,230</p>
              <p className="text-sm text-yellow-700 mt-1">Across all builds</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h3>
              <div className="space-y-4">
                <div className="flex items-center">
                  <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-green-600 text-sm">✓</span>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">Completed Millennium Falcon</p>
                    <p className="text-xs text-gray-500">2 days ago</p>
                  </div>
                </div>
                
                <div className="flex items-center">
                  <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 text-sm">↑</span>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">Shared Custom Creation</p>
                    <p className="text-xs text-gray-500">1 week ago</p>
                  </div>
                </div>
                
                <div className="flex items-center">
                  <div className="h-8 w-8 bg-purple-100 rounded-full flex items-center justify-center">
                    <span className="text-purple-600 text-sm">+</span>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">Added New Instruction</p>
                    <p className="text-xs text-gray-500">1 week ago</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Favorite Series</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-900">Star Wars</span>
                  <span className="text-sm text-gray-500">8 instructions</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-indigo-600 h-2 rounded-full" style={{ width: '60%' }}></div>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-900">Architecture</span>
                  <span className="text-sm text-gray-500">6 instructions</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-green-600 h-2 rounded-full" style={{ width: '45%' }}></div>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-900">Technic</span>
                  <span className="text-sm text-gray-500">4 instructions</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-yellow-600 h-2 rounded-full" style={{ width: '30%' }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 