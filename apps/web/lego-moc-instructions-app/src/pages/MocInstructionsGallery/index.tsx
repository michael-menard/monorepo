import React, { useCallback, useMemo, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Button } from '@repo/ui';
import { Plus } from 'lucide-react';
import { Gallery, GalleryAdapters } from '@monorepo/gallery';
import { useGetInstructionsQuery } from '@repo/moc-instructions';
import type { MockInstruction } from '@repo/moc-instructions';

const MocInstructionsGallery: React.FC = () => {
  const navigate = useNavigate();

  // Fetch instructions using RTK Query
  const { data: instructions = [], isLoading, error } = useGetInstructionsQuery({
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });

  const handleInstructionClick = useCallback((instruction: any) => {
    navigate({ to: '/moc-detail/$id', params: { id: instruction.id } });
  }, [navigate]);

  const handleCreateNew = useCallback(() => {
    navigate({ to: '/moc-gallery' });
  }, [navigate]);

  const handleImageLike = useCallback((imageId: string, liked: boolean) => {
    console.log(`Image ${imageId} ${liked ? 'liked' : 'unliked'}`);
    // TODO: Implement like functionality
  }, []);

  const handleImageShare = useCallback((imageId: string) => {
    console.log(`Sharing image ${imageId}`);
    // TODO: Implement share functionality
  }, []);

  const handleImageDownload = useCallback((imageId: string) => {
    console.log(`Downloading image ${imageId}`);
    // TODO: Implement download functionality
  }, []);

  const handleImageDelete = useCallback((imageId: string) => {
    console.log(`Deleting image ${imageId}`);
    // TODO: Implement delete functionality
  }, []);

  const handleImagesSelected = useCallback((selectedIds: Array<string>) => {
    console.log('Selected images:', selectedIds);
    // TODO: Implement selection functionality
  }, []);



  return (
    <div className="container mx-auto px-4 py-8" data-testid="moc-gallery-page">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">MOC Gallery</h1>
            <p className="text-gray-600">Discover amazing LEGO MOC instructions created by the community</p>
          </div>
          <Button onClick={handleCreateNew} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Create New
          </Button>
        </div>
      </div>

      {/* Gallery Component */}
      <Gallery
        items={instructions}
        preset="instructions"
        loading={isLoading}
        error={error ? 'Error loading instructions' : null}
        adapter={GalleryAdapters.instruction}
        actions={{
          onItemClick: handleInstructionClick,
          onItemLike: handleImageLike,
          onItemShare: handleImageShare,
          onItemDownload: handleImageDownload,
          onItemDelete: handleImageDelete,
          onItemsSelected: handleImagesSelected,
          onRefresh: () => window.location.reload(),
        }}
        className="mb-8"
        data-testid="moc-gallery"
      />
    </div>
  );
};

export default MocInstructionsGallery;
