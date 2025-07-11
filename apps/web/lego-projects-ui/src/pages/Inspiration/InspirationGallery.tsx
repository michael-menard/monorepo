export default function InspirationGallery() {
  return (
    <div className="inspiration-gallery">
      <div className="flex justify-between items-center mb-6">
        <div className="flex space-x-4">
          <button className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">
            All Creations
          </button>
          <button className="px-4 py-2 text-gray-600 hover:text-gray-900">
            Star Wars
          </button>
          <button className="px-4 py-2 text-gray-600 hover:text-gray-900">
            Architecture
          </button>
          <button className="px-4 py-2 text-gray-600 hover:text-gray-900">
            Technic
          </button>
        </div>
        
        <a
          href="/inspiration/upload"
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
        >
          Share Creation
        </a>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {/* Sample inspiration cards */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="h-48 bg-gray-200 flex items-center justify-center">
            <span className="text-gray-500">Image Placeholder</span>
          </div>
          <div className="p-4">
            <h3 className="text-lg font-medium text-gray-900">Custom Millennium Falcon</h3>
            <p className="text-sm text-gray-500 mt-1">by @lego_master</p>
            <div className="mt-3 flex justify-between items-center">
              <span className="text-xs text-gray-400">2,847 pieces</span>
              <button className="text-indigo-600 hover:text-indigo-500 text-sm font-medium">
                View Details
              </button>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="h-48 bg-gray-200 flex items-center justify-center">
            <span className="text-gray-500">Image Placeholder</span>
          </div>
          <div className="p-4">
            <h3 className="text-lg font-medium text-gray-900">Gothic Cathedral</h3>
            <p className="text-sm text-gray-500 mt-1">by @brick_artist</p>
            <div className="mt-3 flex justify-between items-center">
              <span className="text-xs text-gray-400">5,200 pieces</span>
              <button className="text-indigo-600 hover:text-indigo-500 text-sm font-medium">
                View Details
              </button>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="h-48 bg-gray-200 flex items-center justify-center">
            <span className="text-gray-500">Image Placeholder</span>
          </div>
          <div className="p-4">
            <h3 className="text-lg font-medium text-gray-900">Steampunk Airship</h3>
            <p className="text-sm text-gray-500 mt-1">by @creative_builder</p>
            <div className="mt-3 flex justify-between items-center">
              <span className="text-xs text-gray-400">3,156 pieces</span>
              <button className="text-indigo-600 hover:text-indigo-500 text-sm font-medium">
                View Details
              </button>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="h-48 bg-gray-200 flex items-center justify-center">
            <span className="text-gray-500">Image Placeholder</span>
          </div>
          <div className="p-4">
            <h3 className="text-lg font-medium text-gray-900">Futuristic City</h3>
            <p className="text-sm text-gray-500 mt-1">by @city_planner</p>
            <div className="mt-3 flex justify-between items-center">
              <span className="text-xs text-gray-400">8,900 pieces</span>
              <button className="text-indigo-600 hover:text-indigo-500 text-sm font-medium">
                View Details
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 