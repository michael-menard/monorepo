import React from 'react';
import { cn } from '@repo/ui';
import type { GalleryLayout } from '../../types/index';

interface LoadingStateProps {
  layout: GalleryLayout;
  itemCount?: number;
  className?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  layout,
  itemCount = 12,
  className = '',
}) => {
  const renderGridSkeleton = () => (
    <div className={cn('grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4', className)}>
      {Array.from({ length: itemCount }).map((_, index) => (
        <div key={index} className="animate-pulse">
          <div className="bg-gray-200 aspect-[4/3] rounded-lg mb-3"></div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderListSkeleton = () => (
    <div className={cn('space-y-3', className)}>
      {Array.from({ length: Math.min(itemCount, 8) }).map((_, index) => (
        <div key={index} className="animate-pulse flex items-center space-x-4 p-4 bg-white rounded-lg border">
          <div className="w-16 h-16 bg-gray-200 rounded"></div>
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          </div>
          <div className="flex space-x-2">
            <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
            <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderTableSkeleton = () => (
    <div className={cn('bg-white rounded-lg border', className)}>
      {/* Header */}
      <div className="border-b p-4">
        <div className="flex space-x-4">
          <div className="w-16 h-4 bg-gray-200 rounded animate-pulse"></div>
          <div className="flex-1 h-4 bg-gray-200 rounded animate-pulse"></div>
          <div className="w-24 h-4 bg-gray-200 rounded animate-pulse"></div>
          <div className="w-24 h-4 bg-gray-200 rounded animate-pulse"></div>
          <div className="w-32 h-4 bg-gray-200 rounded animate-pulse"></div>
        </div>
      </div>
      
      {/* Rows */}
      <div className="divide-y">
        {Array.from({ length: Math.min(itemCount, 10) }).map((_, index) => (
          <div key={index} className="p-4 animate-pulse">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gray-200 rounded"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
              <div className="w-20 h-4 bg-gray-200 rounded"></div>
              <div className="w-20 h-4 bg-gray-200 rounded"></div>
              <div className="w-24 h-4 bg-gray-200 rounded"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderCarouselSkeleton = () => (
    <div className={cn('', className)}>
      <div className="flex space-x-4">
        {Array.from({ length: Math.min(itemCount, 5) }).map((_, index) => (
          <div key={index} className="flex-shrink-0 w-64 animate-pulse">
            <div className="bg-gray-200 aspect-[4/3] rounded-lg mb-3"></div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Dots */}
      <div className="flex justify-center mt-4 space-x-2">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="w-2 h-2 bg-gray-200 rounded-full animate-pulse"></div>
        ))}
      </div>
    </div>
  );

  const renderMasonrySkeleton = () => (
    <div className={cn('columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-4', className)}>
      {Array.from({ length: itemCount }).map((_, index) => (
        <div key={index} className="break-inside-avoid mb-4 animate-pulse">
          <div 
            className="bg-gray-200 rounded-lg mb-3"
            style={{ height: `${200 + Math.random() * 200}px` }}
          ></div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      ))}
    </div>
  );

  switch (layout) {
    case 'list':
      return renderListSkeleton();
    case 'table':
      return renderTableSkeleton();
    case 'carousel':
      return renderCarouselSkeleton();
    case 'masonry':
      return renderMasonrySkeleton();
    case 'grid':
    default:
      return renderGridSkeleton();
  }
};
