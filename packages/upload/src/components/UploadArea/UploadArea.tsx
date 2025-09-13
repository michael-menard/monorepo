import * as React from 'react';
import type { UploadConfig, UploadPreset } from '../../types/index.js';
import type { UseUploadReturn } from '../../hooks/useUpload.js';
import { useDragAndDrop } from '../../hooks/useDragAndDrop.js';

export interface UploadAreaProps {
  upload: UseUploadReturn;
  config?: UploadConfig;
  preset?: string | UploadPreset;
  disabled?: boolean;
  variant?: 'default' | 'avatar';
  className?: string;
}

export const UploadArea = React.forwardRef<HTMLDivElement, UploadAreaProps>(
  ({ upload, config, preset, disabled = false, variant = 'default', className, ...props }, ref) => {
    const dragAndDrop = useDragAndDrop({
      onFilesDropped: upload.addFiles,
      accept: config?.acceptedFileTypes,
      multiple: config?.multiple,
      disabled,
    });

    const baseClasses = variant === 'avatar' 
      ? 'w-24 h-24 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:border-gray-400'
      : 'border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-gray-400';

    const dragClasses = dragAndDrop.isDragActive 
      ? 'border-blue-500 bg-blue-50' 
      : '';

    const disabledClasses = disabled 
      ? 'opacity-50 cursor-not-allowed' 
      : '';

    return (
      <div
        ref={ref}
        className={`${baseClasses} ${dragClasses} ${disabledClasses} ${className || ''}`}
        {...dragAndDrop.getRootProps()}
        {...props}
      >
        <input {...dragAndDrop.getInputProps()} />
        
        {variant === 'avatar' ? (
          <div className="text-xs text-gray-500">
            {upload.files.length > 0 ? '✓' : '+'}
          </div>
        ) : (
          <div className="space-y-2">
            <div className="text-lg font-medium text-gray-700">
              {dragAndDrop.isDragActive ? 'Drop files here' : 'Drag & drop files here'}
            </div>
            <div className="text-sm text-gray-500">
              or <button type="button" onClick={dragAndDrop.open} className="text-blue-500 hover:text-blue-600">browse files</button>
            </div>
            {config?.acceptedFileTypes && config.acceptedFileTypes.length > 0 && !config.acceptedFileTypes.includes('*/*') && (
              <div className="text-xs text-gray-400">
                Accepted: {config.acceptedFileTypes.join(', ')}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }
);

UploadArea.displayName = 'UploadArea';
