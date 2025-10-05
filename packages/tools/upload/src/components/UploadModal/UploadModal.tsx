import * as React from 'react';
import type { UploadConfig, UploadPreset } from '../../types/index.js';
import type { UseUploadReturn } from '../../hooks/useUpload.js';

export interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  upload: UseUploadReturn;
  config?: UploadConfig;
  preset?: string | UploadPreset;
  disabled?: boolean;
  className?: string;
}

export const UploadModal = React.forwardRef<HTMLDivElement, UploadModalProps>(
  ({ isOpen, onClose, upload, config, preset, disabled = false, className, ...props }, ref) => {
    if (!isOpen) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        {/* Backdrop */}
        <div 
          className="absolute inset-0 bg-black bg-opacity-50" 
          onClick={onClose}
        />
        
        {/* Modal */}
        <div
          ref={ref}
          className={`relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6 ${className || ''}`}
          {...props}
        >
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Upload Files</h2>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
          
          <div className="space-y-4">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <div className="text-lg font-medium text-gray-700">
                Drag & drop files here
              </div>
              <div className="text-sm text-gray-500 mt-2">
                or <button type="button" className="text-blue-500 hover:text-blue-600">browse files</button>
              </div>
            </div>
            
            {upload.files.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-medium">Selected Files:</h3>
                {upload.files.map((file: any) => (
                  <div key={file.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <span className="text-sm truncate">{file.file.name}</span>
                    <button
                      type="button"
                      onClick={() => upload.removeFile(file.id)}
                      className="text-red-500 hover:text-red-700 text-sm"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={upload.startUpload}
                disabled={upload.files.length === 0 || upload.isUploading}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
              >
                {upload.isUploading ? 'Uploading...' : 'Upload'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

UploadModal.displayName = 'UploadModal';
