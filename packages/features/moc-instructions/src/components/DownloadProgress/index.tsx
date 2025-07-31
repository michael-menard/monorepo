import React from 'react';
import { Progress } from '@repo/ui';
import { DownloadProgress } from '../../utils/downloadService';

interface DownloadProgressProps {
  progress: DownloadProgress;
  filename: string;
  onCancel?: () => void;
}

const formatSpeed = (bytesPerSecond: number): string => {
  if (bytesPerSecond === 0) return '0 B/s';
  const k = 1024;
  const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
  const i = Math.floor(Math.log(bytesPerSecond) / Math.log(k));
  return parseFloat((bytesPerSecond / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const formatTime = (seconds: number): string => {
  if (seconds === 0 || !isFinite(seconds)) return '--';
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m ${Math.round(seconds % 60)}s`;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
};

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const DownloadProgressComponent: React.FC<DownloadProgressProps> = ({
  progress,
  filename,
  onCancel,
}) => {
  return (
    <div className="w-full max-w-md p-4 border rounded-lg bg-white shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-medium text-gray-900 truncate" title={filename}>
          {filename}
        </h4>
        {onCancel && (
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            title="Cancel download"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
      
      <div className="mb-2">
        <Progress value={progress.percentage} className="h-2" />
      </div>
      
      <div className="flex items-center justify-between text-xs text-gray-600">
        <span>{progress.percentage}%</span>
        <span>{formatBytes(progress.loaded)} / {formatBytes(progress.total)}</span>
      </div>
      
      <div className="flex items-center justify-between text-xs text-gray-500 mt-1">
        <span>{formatSpeed(progress.speed)}</span>
        <span>ETA: {formatTime(progress.estimatedTime)}</span>
      </div>
    </div>
  );
}; 