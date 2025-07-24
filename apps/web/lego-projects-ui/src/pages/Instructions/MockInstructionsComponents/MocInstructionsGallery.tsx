import React, { useState, useCallback, useRef, useEffect } from 'react';
import MocGalleryCard, { MocGalleryCardSchema, MocGalleryCardData } from './MocGalleryCard';
// Extensionless import is required for TypeScript source files that are not built to .js
import FilterBar from '../../gallery/src/components/FilterBar';
import { z } from 'zod';

// For now, mock the API call to fetch MOC items
const mockMocs: MocGalleryCardData[] = [
  {
    title: 'Starfighter Instructions',
    imageUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb',
    instructionsAvailable: true,
    tags: ['starfighter', 'space', 'sci-fi'],
    designer: 'Jane Doe',
  },
  {
    title: 'Castle Build',
    imageUrl: 'https://images.unsplash.com/photo-1465101046530-73398c7f28ca',
    instructionsAvailable: false,
    tags: ['castle', 'medieval'],
  },
  {
    title: 'Robot Instructions',
    imageUrl: 'https://images.unsplash.com/photo-1519125323398-675f0ddb6308',
    instructionsAvailable: true,
    tags: ['robot', 'mech'],
    designer: 'Alex Smith',
  },
];

export interface MocInstructionsGalleryProps {
  className?: string;
}

const MocInstructionsGallery: React.FC<MocInstructionsGalleryProps> = ({ className = '' }) => {
  const [search, setSearch] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [filteredMocs, setFilteredMocs] = useState<MocGalleryCardData[]>(mockMocs);
  const [selectedMoc, setSelectedMoc] = useState<MocGalleryCardData | null>(null);

  // Filter logic (mocked for now)
  useEffect(() => {
    let results = mockMocs;
    if (search) {
      results = results.filter(moc =>
        moc.title.toLowerCase().includes(search.toLowerCase()) ||
        (moc.tags?.some((tag: string) => tag.toLowerCase().includes(search.toLowerCase())))
      );
    }
    if (selectedTags.length > 0) {
      results = results.filter(moc =>
        moc.tags && selectedTags.every(tag => moc.tags!.includes(tag))
      );
    }
    setFilteredMocs(results);
  }, [search, selectedTags]);

  // Placeholder for available tags (could be fetched from API)
  const availableTags = Array.from(new Set(mockMocs.flatMap(moc => moc.tags || [])));

  // Infinite scroll (mocked: all items loaded at once)
  // In real implementation, use IntersectionObserver and paginated API

  return (
    <div className={`space-y-6 ${className}`} data-testid="moc-instructions-gallery">
      {/* Filter/Search Bar */}
      <FilterBar
        onSearchChange={setSearch}
        onTagsChange={setSelectedTags}
        availableTags={availableTags}
        searchPlaceholder="Search MOCs by title or tag..."
        debounceMs={200}
      />

      {/* Gallery Grid */}
      {filteredMocs.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredMocs.map((moc, idx) => (
            <MocGalleryCard
              key={idx}
              data={moc}
              onClick={() => setSelectedMoc(moc)}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-gray-500">No MOCs found. Try adjusting your search or filters.</div>
      )}

      {/* Instructions Drawer/Modal (placeholder) */}
      {selectedMoc && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4 relative">
            <button
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-800"
              onClick={() => setSelectedMoc(null)}
              aria-label="Close"
            >
              ×
            </button>
            <h2 className="text-xl font-bold mb-4">{selectedMoc.title}</h2>
            <p className="mb-2">Designer: {selectedMoc.designer || 'Unknown'}</p>
            <div className="mb-4">
              {selectedMoc.tags && selectedMoc.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {selectedMoc.tags.map((tag: string) => (
                    <span key={tag} className="bg-gray-200 text-xs px-2 py-1 rounded">{tag}</span>
                  ))}
                </div>
              )}
            </div>
            {selectedMoc.instructionsAvailable ? (
              <button className="bg-blue-600 text-white px-4 py-2 rounded">Download Instructions</button>
            ) : (
              <span className="text-gray-500">No instructions available for this MOC.</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MocInstructionsGallery; 