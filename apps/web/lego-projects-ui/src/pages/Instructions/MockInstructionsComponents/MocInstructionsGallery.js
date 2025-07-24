import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useCallback, useRef, useEffect } from 'react';
import MocGalleryCard, { MocGalleryCardSchema, MocGalleryCardData } from './MocGalleryCard';
// Extensionless import is required for TypeScript source files that are not built to .js
import FilterBar from '../../gallery/src/components/FilterBar';
import { z } from 'zod';
// For now, mock the API call to fetch MOC items
const mockMocs = [
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
const MocInstructionsGallery = ({ className = '' }) => {
    const [search, setSearch] = useState('');
    const [selectedTags, setSelectedTags] = useState([]);
    const [filteredMocs, setFilteredMocs] = useState(mockMocs);
    const [selectedMoc, setSelectedMoc] = useState(null);
    // Filter logic (mocked for now)
    useEffect(() => {
        let results = mockMocs;
        if (search) {
            results = results.filter(moc => moc.title.toLowerCase().includes(search.toLowerCase()) ||
                (moc.tags?.some((tag) => tag.toLowerCase().includes(search.toLowerCase()))));
        }
        if (selectedTags.length > 0) {
            results = results.filter(moc => moc.tags && selectedTags.every(tag => moc.tags.includes(tag)));
        }
        setFilteredMocs(results);
    }, [search, selectedTags]);
    // Placeholder for available tags (could be fetched from API)
    const availableTags = Array.from(new Set(mockMocs.flatMap(moc => moc.tags || [])));
    // Infinite scroll (mocked: all items loaded at once)
    // In real implementation, use IntersectionObserver and paginated API
    return (_jsxs("div", { className: `space-y-6 ${className}`, "data-testid": "moc-instructions-gallery", children: [_jsx(FilterBar, { onSearchChange: setSearch, onTagsChange: setSelectedTags, availableTags: availableTags, searchPlaceholder: "Search MOCs by title or tag...", debounceMs: 200 }), filteredMocs.length > 0 ? (_jsx("div", { className: "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6", children: filteredMocs.map((moc, idx) => (_jsx(MocGalleryCard, { data: moc, onClick: () => setSelectedMoc(moc) }, idx))) })) : (_jsx("div", { className: "text-center py-12 text-gray-500", children: "No MOCs found. Try adjusting your search or filters." })), selectedMoc && (_jsx("div", { className: "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50", children: _jsxs("div", { className: "bg-white rounded-lg p-8 max-w-md w-full mx-4 relative", children: [_jsx("button", { className: "absolute top-2 right-2 text-gray-500 hover:text-gray-800", onClick: () => setSelectedMoc(null), "aria-label": "Close", children: "\u00D7" }), _jsx("h2", { className: "text-xl font-bold mb-4", children: selectedMoc.title }), _jsxs("p", { className: "mb-2", children: ["Designer: ", selectedMoc.designer || 'Unknown'] }), _jsx("div", { className: "mb-4", children: selectedMoc.tags && selectedMoc.tags.length > 0 && (_jsx("div", { className: "flex flex-wrap gap-1", children: selectedMoc.tags.map((tag) => (_jsx("span", { className: "bg-gray-200 text-xs px-2 py-1 rounded", children: tag }, tag))) })) }), selectedMoc.instructionsAvailable ? (_jsx("button", { className: "bg-blue-600 text-white px-4 py-2 rounded", children: "Download Instructions" })) : (_jsx("span", { className: "text-gray-500", children: "No instructions available for this MOC." }))] }) }))] }));
};
export default MocInstructionsGallery;
