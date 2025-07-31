import React, { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@repo/ui';
import { Plus } from 'lucide-react';

// Import from moc-instructions package
import {
  MocInstructionsGallery as MocInstructionsGalleryComponent,
  useDeleteInstructionMutation,
  useGetInstructionsQuery,
  type MockInstructionFilter,
  type MockInstructionSortBy,
  type SortOrder,
} from '@repo/moc-instructions';

export interface MocInstructionsGalleryProps {
  className?: string;
  layout?: 'grid' | 'list';
  columns?: {
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
  gap?: number;
  isEditable?: boolean;
}

const MocInstructionsGallery: React.FC<MocInstructionsGalleryProps> = ({
  className = '',
  layout = 'grid',
  columns = { sm: 1, md: 2, lg: 3, xl: 4 },
  gap = 4,
  isEditable = false,
}) => {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<MockInstructionFilter>({
    search: '',
    category: undefined,
    difficulty: undefined,
    isPublic: true,
    isPublished: true,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });

  // RTK Query hooks
  const { data: instructions = [], isLoading, error } = useGetInstructionsQuery(filters);
  const [deleteInstruction] = useDeleteInstructionMutation();

  const handleInstructionClick = useCallback((instruction: any) => {
    navigate(`/moc-instructions/${instruction.id}`);
  }, [navigate]);

  const handleInstructionDelete = useCallback(async (instructionId: string) => {
    try {
      await deleteInstruction(instructionId).unwrap();
    } catch (error) {
      console.error('Failed to delete instruction:', error);
    }
  }, [deleteInstruction]);

  const handleFiltersChange = useCallback((newFilters: MockInstructionFilter) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  const handleSortChange = useCallback((newSortBy: MockInstructionSortBy, newSortOrder: SortOrder) => {
    setFilters(prev => ({ ...prev, sortBy: newSortBy, sortOrder: newSortOrder }));
  }, []);

  const handleCreateNew = useCallback(() => {
    navigate('/moc-instructions/create');
  }, [navigate]);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-64 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Instructions</h2>
          <p className="text-gray-600">Failed to load the instructions. Please try again.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">MOC Instructions Gallery</h1>
            <p className="text-gray-600">Discover amazing LEGO MOC instructions created by the community</p>
          </div>
          {isEditable && (
            <Button onClick={handleCreateNew} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Create New
            </Button>
          )}
        </div>
      </div>

      <div className={`space-y-6 ${className}`}>
        <MocInstructionsGalleryComponent
          instructions={instructions}
          onInstructionClick={handleInstructionClick}
          onInstructionDelete={handleInstructionDelete}
          filters={filters}
          onFiltersChange={handleFiltersChange}
          sortBy={filters.sortBy}
          sortOrder={filters.sortOrder}
          onSortChange={handleSortChange}
          layout={layout}
          columns={columns}
          gap={gap}
          isEditable={isEditable}
          className="space-y-6"
        />
      </div>
    </div>
  );
};

export default MocInstructionsGallery; 