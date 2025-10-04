import React, { useCallback, useMemo, useState, useEffect } from 'react';

// Simple debounce function
const debounce = (func: Function, wait: number) => {
  let timeout: NodeJS.Timeout;
  return function executedFunction(...args: any[]) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};
import { useNavigate } from '@tanstack/react-router';
import { Button, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@repo/ui';
import { Plus, Search, Grid, List, LayoutGrid, Table } from 'lucide-react';
import { Gallery } from '@repo/gallery';
import { CreateMocModal, type CreateMocData } from '../../components/CreateMocModal';

// Import real API hooks instead of mock data
import { useGetInstructionsQuery, useCreateInstructionWithFilesMutation } from '@repo/moc-instructions';

// Note: Avoiding setFilter import issues by implementing filtering locally

const MocInstructionsGallery: React.FC = () => {
  console.log('🎯 MocInstructionsGallery component is rendering!');
  console.log('🎯 Component mounted at:', new Date().toISOString());

  const navigate = useNavigate();

  // Local state for search and filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [sortBy, setSortBy] = useState('recent');
  const [currentLayout, setCurrentLayout] = useState<'grid' | 'list' | 'masonry' | 'table'>('grid');

  // Modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Use real API instead of mock data
  // Since the API only has search endpoint, we'll search with empty query to get all MOCs
  const {
    data: apiResponse,
    isLoading,
    error,
    refetch: refetchInstructions
  } = useGetInstructionsQuery({
    q: '', // Empty query to get all MOCs
    from: 0,
    size: 100, // Get first 100 MOCs
  });

  // RTK Query mutation for creating MOCs
  const [createMocWithFiles, { isLoading: isCreating }] = useCreateInstructionWithFilesMutation();

  // Helper function to extract error message from RTK Query error
  const getErrorMessage = useCallback((error: any): string => {
    if (!error) return 'An unexpected error occurred';

    // RTK Query error structure
    if (error.status && error.data) {
      return error.data.message || error.data.error || `Error ${error.status}`;
    }

    // Network error
    if (error.message) {
      return error.message;
    }

    // Fallback
    return String(error);
  }, []);

  // Extract MOCs from API response and transform to expected format
  const allInstructions = useMemo(() => {
    console.log('🔍 API Response:', apiResponse);
    if (!apiResponse?.mocs) {
      console.log('⚠️ No mocs found in API response');
      return [];
    }

    console.log('📋 Found', apiResponse.mocs.length, 'MOCs');
    // Transform backend MOC data to match gallery expectations
    return apiResponse.mocs.map((moc: any) => ({
      id: moc.id,
      title: moc.title,
      description: moc.description || '',
      author: 'User', // TODO: Get actual user name from user ID
      category: moc.tags?.[0] || 'Other', // Use first tag as category
      difficulty: 'intermediate', // TODO: Add difficulty to backend
      pieces: 0, // TODO: Calculate from parts lists
      estimatedTime: 60, // TODO: Add to backend
      tags: moc.tags || [],
      coverImageUrl: moc.thumbnailUrl,
      rating: 4.5, // TODO: Calculate from reviews
      downloadCount: 0, // TODO: Add to backend
      createdAt: moc.createdAt,
      updatedAt: moc.updatedAt,
      isPublic: true,
      isPublished: true,
    }));
  }, [apiResponse]);

  // Extract unique categories from the actual data
  const availableCategories = useMemo(() => {
    if (!allInstructions || allInstructions.length === 0) return [];
    const categories = [...new Set(allInstructions.map(instruction => instruction.category))];
    return categories.sort();
  }, [allInstructions]);

  // Local filtering logic to avoid Redux import issues
  const filteredInstructions = useMemo(() => {
    console.log('🔄 useMemo recalculating with:', { searchQuery, selectedCategory, sortBy });
    if (!allInstructions) return [];

    let filtered = [...allInstructions];

    // Apply search filter
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      filtered = filtered.filter(inst =>
        inst.title.toLowerCase().includes(searchLower) ||
        inst.description.toLowerCase().includes(searchLower) ||
        inst.author.toLowerCase().includes(searchLower) ||
        inst.tags.some(tag => tag.toLowerCase().includes(searchLower))
      );
    }

    // Apply category filter
    if (selectedCategory) {
      filtered = filtered.filter(inst => inst.category === selectedCategory);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      console.log(`🔄 Sorting by: ${sortBy}`);
      switch (sortBy) {
        case 'recent':
          const dateA = new Date(a.createdAt).getTime();
          const dateB = new Date(b.createdAt).getTime();
          console.log(`📅 Comparing dates: ${a.title} (${dateA}) vs ${b.title} (${dateB})`);
          return dateB - dateA;
        case 'popular':
        case 'downloaded': // Handle both popular and downloaded
          const downloadsA = a.downloadCount || 0;
          const downloadsB = b.downloadCount || 0;
          console.log(`📊 Comparing downloads: ${a.title} (${downloadsA}) vs ${b.title} (${downloadsB})`);
          return downloadsB - downloadsA;
        case 'rated':
          const ratingA = a.rating || 0;
          const ratingB = b.rating || 0;
          console.log(`⭐ Comparing ratings: ${a.title} (${ratingA}) vs ${b.title} (${ratingB})`);
          return ratingB - ratingA;
        case 'pieces':
          const piecesA = a.totalParts || 0;
          const piecesB = b.totalParts || 0;
          console.log(`🧱 Comparing piece counts: ${a.title} (${piecesA}) vs ${b.title} (${piecesB})`);
          return piecesB - piecesA;
        case 'alphabetical':
          console.log(`🔤 Comparing titles: ${a.title} vs ${b.title}`);
          return a.title.localeCompare(b.title);
        default:
          console.log(`🔄 Default sorting (recent)`);
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

    return filtered;
  }, [allInstructions, searchQuery, selectedCategory, sortBy]);

  // Debug logging
  console.log('🔍 MocInstructionsGallery Debug:', {
    allInstructionsLength: allInstructions?.length,
    filteredInstructionsLength: filteredInstructions?.length,
    isLoading,
    error,
    selectedCategory,
    searchQuery,
    sortBy,
    availableCategories,
  });

  // Debug the first few items to see their data
  if (filteredInstructions && filteredInstructions.length > 0) {
    console.log('📋 First few filtered instructions:',
      filteredInstructions.slice(0, 3).map(inst => ({
        title: inst.title,
        createdAt: inst.createdAt,
        downloadCount: inst.downloadCount,
        rating: inst.rating,
      }))
    );
  }

  // Real API automatically fetches data, no need for manual useEffect

  const handleInstructionClick = useCallback((instruction: any) => {
    navigate({ to: '/moc-detail/$id', params: { id: instruction.id } });
  }, [navigate]);



  const handleImageLike = useCallback((imageId: string, liked: boolean) => {
    console.log(`Image ${imageId} ${liked ? 'liked' : 'unliked'}`);
    // TODO: Implement like functionality
  }, []);

  const handleImageShare = useCallback((imageId: string) => {
    console.log(`Sharing image ${imageId}`);
    // TODO: Implement share functionality
  }, []);

  const handleImageDownload = useCallback(async (imageId: string) => {
    console.log(`Downloading image ${imageId}`);
    // TODO: Implement download count increment with real API
    try {
      // For now, just log the download
      console.log('Download count would be incremented for image:', imageId);
    } catch (error) {
      console.error('Failed to increment download count:', error);
    }
  }, []);

  const handleImageDelete = useCallback((imageId: string) => {
    console.log(`Deleting image ${imageId}`);
    // TODO: Implement delete functionality
  }, []);

  const handleImagesSelected = useCallback((selectedIds: Array<string>) => {
    console.log('Selected images:', selectedIds);
    // TODO: Implement selection functionality
  }, []);

  const handleSearch = useCallback((query: string) => {
    console.log('🔍 Search query:', query);
    setSearchQuery(query);
  }, []);

  const handleCategoryChange = useCallback((category: string) => {
    console.log('🏷️ Category changed:', category);
    // Convert "all" back to empty string for filtering logic
    const actualCategory = category === "all" ? "" : category;
    setSelectedCategory(actualCategory);
  }, []);

  const handleSortChange = useCallback((sort: string) => {
    console.log('📊 Sort changed from', sortBy, 'to', sort);
    setSortBy(sort);
    console.log('📊 Sort state updated to:', sort);
  }, [sortBy]);

  const handleLayoutChange = useCallback((layout: 'grid' | 'list' | 'masonry' | 'table') => {
    console.log('🎨 Layout changed to:', layout);
    setCurrentLayout(layout);
  }, []);

  // Modal handlers
  const handleCreateNew = useCallback(() => {
    console.log('🔘 Create New MOC button clicked');
    console.log('🔘 Current modal state:', isCreateModalOpen);
    setIsCreateModalOpen(true);
    console.log('🔘 Modal state should now be true');
  }, [isCreateModalOpen]);

  const handleCloseModal = useCallback(() => {
    setIsCreateModalOpen(false);
  }, []);

  const handleSubmitMoc = useCallback(async (mocData: CreateMocData) => {
    console.log('📝 New MOC submitted:', mocData);

    try {
      // For now, send just JSON data (files temporarily disabled)
      const jsonData = {
        title: mocData.title,
        description: mocData.description,
        // Note: Files are temporarily disabled
        filesDisabled: true
      };

      console.log('📤 Sending JSON data to API via RTK Query...');

      // Use RTK Query mutation (automatically handles cache invalidation)
      const result = await createMocWithFiles(jsonData).unwrap();
      console.log('✅ MOC created successfully:', result);

      // Show success message
      alert('MOC created successfully! 🎉');

      // Manually refetch the gallery data to ensure it updates
      console.log('🔄 Manually refreshing gallery...');
      refetchInstructions();

    } catch (error: any) {
      console.error('❌ Error creating MOC:', error);
      const errorMessage = error?.data?.error || error?.message || 'Unknown error';
      alert(`Failed to create MOC: ${errorMessage}`);
    }
  }, [createMocWithFiles]);

  const handleFilter = useCallback((filters: any) => {
    console.log('Filters applied:', filters);
    // TODO: Implement filter functionality with Redux
    // dispatch(setFilters(filters));
  }, []);

  const handleSort = useCallback((sortBy: string, sortOrder: 'asc' | 'desc') => {
    console.log('Sort applied:', { sortBy, sortOrder });
    // TODO: Implement sort functionality with Redux
    // dispatch(setSortOptions({ sortBy, sortOrder }));
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50" data-testid="moc-gallery-page">
      {/* Hero Header Section */}
      <div className="relative bg-gradient-to-r from-blue-500 via-cyan-500 to-emerald-500 overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-white/5">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.08'%3E%3Ccircle cx='30' cy='30' r='4'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }} />
        </div>

        <div className="relative container mx-auto px-4 py-16">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center px-3 py-1 rounded-full bg-white/20 text-white text-sm font-medium mb-4">
                🧱 Community Creations
              </div>
              <h1 className="text-4xl lg:text-6xl font-bold text-white mb-4 leading-tight">
                MOC Gallery
              </h1>
              <p className="text-xl text-blue-100 mb-6 max-w-2xl">
                Discover incredible LEGO MOC instructions crafted by passionate builders worldwide.
                Get inspired, learn new techniques, and share your own creations.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  onClick={handleCreateNew}
                  size="lg"
                  className="bg-white text-emerald-600 hover:bg-emerald-50 font-semibold px-8 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Create New MOC
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="border-white/30 text-white hover:bg-white/10 font-semibold px-8 py-3 rounded-xl backdrop-blur-sm"
                >
                  Browse Featured
                </Button>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 gap-4 lg:gap-6">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-center border border-white/20">
                <div className="text-3xl font-bold text-white mb-1">{filteredInstructions?.length || 0}</div>
                <div className="text-blue-100 text-sm">MOC Instructions</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-center border border-white/20">
                <div className="text-3xl font-bold text-white mb-1">12K+</div>
                <div className="text-blue-100 text-sm">Downloads</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-center border border-white/20">
                <div className="text-3xl font-bold text-white mb-1">850+</div>
                <div className="text-blue-100 text-sm">Builders</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-center border border-white/20">
                <div className="text-3xl font-bold text-white mb-1">4.8★</div>
                <div className="text-blue-100 text-sm">Avg Rating</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="container mx-auto px-4 py-12">





      {/* Gallery Component with Custom Search Layout */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
        <div className="p-6">
          {/* Search Bar - Full width on top */}
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-5 w-5 pointer-events-none" />
              <Input
                type="text"
                value={searchQuery}
                placeholder="Search MOCs by title, author, or description..."
                className="w-full pl-10 pr-4 py-3 text-lg border-slate-200 rounded-xl focus:ring-2 focus:ring-cyan-400 focus:border-transparent bg-white text-slate-700"
                onChange={(e) => handleSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Filter Controls and Layout Toggle Row - Full width */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 mb-6 w-full">
            {/* Left side - Filter dropdowns */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 flex-shrink-0">
              <Select value={selectedCategory || "all"} onValueChange={handleCategoryChange}>
                <SelectTrigger className="min-w-[160px] h-12">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {availableCategories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={handleSortChange}>
                <SelectTrigger className="min-w-[160px] h-12">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent">Most Recent</SelectItem>
                  <SelectItem value="popular">Most Popular</SelectItem>
                  <SelectItem value="rated">Highest Rated</SelectItem>
                  <SelectItem value="downloaded">Most Downloaded</SelectItem>
                  <SelectItem value="pieces">Most Pieces</SelectItem>
                  <SelectItem value="alphabetical">A-Z</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Right side - Layout Toggle Buttons with more space */}
            <div className="flex items-center justify-center lg:justify-end">
              <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                <button
                  onClick={() => handleLayoutChange('grid')}
                  className={`flex items-center justify-center px-5 py-3 min-w-[52px] h-12 transition-all duration-200 ${
                    currentLayout === 'grid'
                      ? 'bg-cyan-50 text-cyan-600 border-r border-cyan-200'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800 border-r border-slate-200'
                  }`}
                  title="Grid View"
                  aria-label="Grid View"
                >
                  <Grid className="w-5 h-5" />
                </button>

                <button
                  onClick={() => handleLayoutChange('list')}
                  className={`flex items-center justify-center px-5 py-3 min-w-[52px] h-12 transition-all duration-200 ${
                    currentLayout === 'list'
                      ? 'bg-cyan-50 text-cyan-600 border-r border-cyan-200'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800 border-r border-slate-200'
                  }`}
                  title="List View"
                  aria-label="List View"
                >
                  <List className="w-5 h-5" />
                </button>

                <button
                  onClick={() => handleLayoutChange('masonry')}
                  className={`flex items-center justify-center px-5 py-3 min-w-[52px] h-12 transition-all duration-200 ${
                    currentLayout === 'masonry'
                      ? 'bg-cyan-50 text-cyan-600 border-r border-cyan-200'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800 border-r border-slate-200'
                  }`}
                  title="Masonry View"
                  aria-label="Masonry View"
                >
                  <LayoutGrid className="w-5 h-5" />
                </button>

                <button
                  onClick={() => handleLayoutChange('table')}
                  className={`flex items-center justify-center px-5 py-3 min-w-[52px] h-12 transition-all duration-200 ${
                    currentLayout === 'table'
                      ? 'bg-cyan-50 text-cyan-600'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
                  }`}
                  title="Table View"
                  aria-label="Table View"
                >
                  <Table className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Gallery with filtered instructions */}
          <Gallery
            images={filteredInstructions.map(instruction => ({
              id: instruction.id,
              url: instruction.coverImageUrl || '/placeholder-instruction.jpg',
              title: instruction.title,
              description: instruction.description,
              author: instruction.author,
              tags: instruction.tags,
              createdAt: new Date(instruction.createdAt),
              updatedAt: new Date(instruction.updatedAt),
            }))}
            layout={currentLayout === 'masonry' ? 'masonry' : 'grid'}
            onImageClick={(image) => {
              const instruction = filteredInstructions.find(i => i.id === image.id);
              if (instruction) {
                navigate({ to: `/moc-instructions/${instruction.id}` });
              }
            }}
            data-testid="moc-gallery"
          />
        </div>
      </div>

      {/* Modern Empty State */}
      {!isLoading && (!filteredInstructions || filteredInstructions.length === 0) && (
        <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-12 text-center">
          <div className="max-w-md mx-auto">
            <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <div className="text-4xl">🧱</div>
            </div>
            <h3 className="text-2xl font-bold text-slate-700 mb-3">No MOC Instructions Yet</h3>
            <p className="text-slate-600 mb-8 leading-relaxed">
              Be the first to share your amazing LEGO creation! Upload your MOC instructions
              and inspire builders around the world.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                onClick={handleCreateNew}
                size="lg"
                className="bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white font-semibold px-8 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
              >
                <Plus className="h-5 w-5 mr-2" />
                Create First MOC
              </Button>
              <Button
                onClick={() => refetchInstructions()}
                variant="outline"
                size="lg"
                className="border-slate-200 hover:bg-slate-50 font-semibold px-8 py-3 rounded-xl text-slate-600"
              >
                Refresh Gallery
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modern Loading State */}
      {isLoading && (
        <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-12 text-center">
          <div className="flex flex-col items-center">
            <div className="relative">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-100"></div>
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent absolute top-0 left-0"></div>
            </div>
            <div className="mt-6">
              <h3 className="text-xl font-semibold text-slate-700 mb-2">Loading Amazing MOCs</h3>
              <p className="text-slate-600">Discovering the latest community creations...</p>
            </div>
          </div>
        </div>
      )}

      {/* Modern Error State */}
      {error && (
        <div className="bg-white rounded-2xl shadow-lg border border-red-100 p-12 text-center">
          <div className="max-w-md mx-auto">
            <div className="w-24 h-24 bg-gradient-to-br from-red-100 to-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <div className="text-4xl">⚠️</div>
            </div>
            <h3 className="text-2xl font-bold text-red-700 mb-3">Oops! Something went wrong</h3>
            <p className="text-red-600 mb-2 font-medium">
              {getErrorMessage(error)}
            </p>
            <p className="text-slate-600 mb-8">
              Don't worry, this happens sometimes. Try refreshing the page or check back later.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                onClick={() => window.location.reload()}
                size="lg"
                className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-8 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
              >
                Try Again
              </Button>
              <Button
                onClick={handleCreateNew}
                variant="outline"
                size="lg"
                className="border-slate-200 hover:bg-slate-50 font-semibold px-8 py-3 rounded-xl text-slate-600"
              >
                Create New MOC
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Create MOC Modal */}
      <CreateMocModal
        isOpen={isCreateModalOpen}
        onClose={handleCloseModal}
        onSubmit={handleSubmitMoc}
        isLoading={isCreating}
      />

      </div>
    </div>
  );
};

export default MocInstructionsGallery;
