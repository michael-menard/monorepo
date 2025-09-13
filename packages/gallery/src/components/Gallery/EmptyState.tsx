import React from 'react';
import { cn } from '@repo/ui';
import { ImageIcon, Plus } from 'lucide-react';

interface EmptyStateProps {
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'No items found',
  description = 'Try adjusting your search or filters',
  actionLabel,
  onAction,
  className = '',
}) => {
  return (
    <div className={cn('flex flex-col items-center justify-center text-center p-8', className)}>
      <div className="w-16 h-16 text-gray-400 mb-4">
        <ImageIcon className="w-full h-full" />
      </div>
      
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        {title}
      </h3>
      
      <p className="text-gray-600 mb-6 max-w-md">
        {description}
      </p>
      
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          {actionLabel}
        </button>
      )}
    </div>
  );
};
