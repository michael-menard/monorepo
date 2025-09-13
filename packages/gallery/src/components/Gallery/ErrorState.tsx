import React from 'react';
import { cn } from '@repo/ui';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorStateProps {
  error: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  error,
  onRetry,
  className = '',
}) => {
  return (
    <div className={cn('flex flex-col items-center justify-center text-center p-8', className)}>
      <div className="w-16 h-16 text-red-500 mb-4">
        <AlertCircle className="w-full h-full" />
      </div>
      
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        Something went wrong
      </h3>
      
      <p className="text-gray-600 mb-6 max-w-md">
        {error || 'An unexpected error occurred while loading the gallery.'}
      </p>
      
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Try Again
        </button>
      )}
    </div>
  );
};
