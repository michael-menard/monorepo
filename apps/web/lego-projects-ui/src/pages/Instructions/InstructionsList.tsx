export default function InstructionsList() {
  return (
    <div className="instructions-list">
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-gray-900">All Instructions</h1>
          <p className="mt-1 text-sm text-gray-500">
            Browse and manage your Lego building instructions
          </p>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Sample instruction cards */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Millennium Falcon</h3>
              <p className="text-sm text-gray-500 mt-1">Star Wars Collection</p>
              <div className="mt-4 flex justify-between items-center">
                <span className="text-xs text-gray-400">2,500 pieces</span>
                <button className="text-indigo-600 hover:text-indigo-500 text-sm font-medium">
                  View Details
                </button>
              </div>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Tower Bridge</h3>
              <p className="text-sm text-gray-500 mt-1">Architecture Series</p>
              <div className="mt-4 flex justify-between items-center">
                <span className="text-xs text-gray-400">4,295 pieces</span>
                <button className="text-indigo-600 hover:text-indigo-500 text-sm font-medium">
                  View Details
                </button>
              </div>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Porsche 911</h3>
              <p className="text-sm text-gray-500 mt-1">Technic Series</p>
              <div className="mt-4 flex justify-between items-center">
                <span className="text-xs text-gray-400">1,458 pieces</span>
                <button className="text-indigo-600 hover:text-indigo-500 text-sm font-medium">
                  View Details
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 