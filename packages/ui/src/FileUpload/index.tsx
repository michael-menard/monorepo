import React, { useRef, useCallback } from 'react';
import { Button } from '../button';
import { Input } from '../input';
import { Label } from '../label';
import { cn } from '../lib/utils';
import { useFileUpload, useMetadataFields, useDragAndDrop, MetadataField } from './hooks';

export interface FileUploadProps {
  accept?: string | string[];
  maxSizeMB?: number;
  multiple?: boolean;
  showPreview?: boolean;
  showCropper?: boolean;
  cropAspectRatio?: number;
  onUpload: (files: File[] | File, metadata?: Record<string, any>) => Promise<void> | void;
  onRemove?: (file: File) => void;
  onError?: (error: string) => void;
  metadataFields?: MetadataField[];
  mode?: 'modal' | 'inline' | 'avatar';
  initialFiles?: File[];
  uploadButtonLabel?: string;
  disabled?: boolean;
  className?: string;
  dragAreaClassName?: string;
  previewClassName?: string;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  accept = 'image/*',
  maxSizeMB = 20,
  multiple = false,
  showPreview = true,
  showCropper = false,
  cropAspectRatio = 1,
  onUpload,
  onRemove,
  onError,
  metadataFields = [],
  mode = 'inline',
  initialFiles = [],
  uploadButtonLabel = 'Upload Files',
  disabled = false,
  className,
  dragAreaClassName,
  previewClassName,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Custom hooks
  const { state: fileState, actions: fileActions } = useFileUpload(
    { accept, maxSizeMB, multiple, onError: onError || undefined },
    onUpload
  );

  const { state: metadataState, actions: metadataActions } = useMetadataFields(metadataFields);

  const { state: dragState, actions: dragActions } = useDragAndDrop();

  // Initialize with initial files if provided
  React.useEffect(() => {
    if (initialFiles.length > 0) {
      fileActions.addFiles(initialFiles);
    }
  }, [initialFiles, fileActions]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      fileActions.addFiles(files);
    }
    // Reset input value to allow selecting the same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [fileActions]);

  const handleRemoveFile = useCallback((file: File) => {
    fileActions.removeFile(file);
    onRemove?.(file);
  }, [fileActions, onRemove]);

  const handleUpload = useCallback(async () => {
    if (!metadataState.isValid) {
      metadataActions.validateAll();
      return;
    }

    const metadata = metadataFields.length > 0 ? metadataState.values : undefined;
    await fileActions.upload(metadata);
  }, [fileActions, metadataState, metadataActions, metadataFields]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    dragActions.handleDrop(e, fileActions.addFiles);
  }, [dragActions, fileActions]);

  const openFileDialog = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const getDragAreaClassNames = () => {
    const baseClasses = 'border-2 border-dashed rounded-lg p-6 text-center transition-colors';
    const dragClasses = dragState.isDragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400';
    const disabledClasses = disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer';
    
    return cn(baseClasses, dragClasses, disabledClasses, dragAreaClassName);
  };

  const getPreviewClassNames = () => {
    return cn('mt-4 space-y-2', previewClassName);
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={Array.isArray(accept) ? accept.join(',') : accept}
        multiple={multiple}
        onChange={handleFileInputChange}
        className="hidden"
        disabled={disabled}
      />

      {/* Drag and drop area */}
      <div
        className={getDragAreaClassNames()}
        onClick={!disabled ? openFileDialog : undefined}
        {...dragActions.dragAreaProps}
        onDrop={handleDrop}
      >
        <div className="space-y-2">
          <p className="text-sm text-gray-600">
            Drop files here or <span className="text-blue-600 hover:text-blue-800">browse</span>
          </p>
          <p className="text-xs text-gray-500">
            {Array.isArray(accept) ? accept.join(', ') : accept} • Max {maxSizeMB}MB
            {multiple ? ' • Multiple files allowed' : ''}
          </p>
        </div>
      </div>

      {/* Error messages */}
      {fileState.errors.length > 0 && (
        <div className="space-y-1">
          {fileState.errors.map((error, index) => (
            <p key={index} className="text-sm text-red-600">
              {error}
            </p>
          ))}
        </div>
      )}

      {/* File preview */}
      {showPreview && fileState.files.length > 0 && (
        <div className={getPreviewClassNames()}>
          <h4 className="font-medium text-sm text-gray-700">
            Selected Files ({fileState.files.length})
          </h4>
          <div className="space-y-2">
            {fileState.files.map((file, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-700">{file.name}</span>
                  <span className="text-xs text-gray-500">
                    ({(file.size / 1024 / 1024).toFixed(2)} MB)
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRemoveFile(file)}
                  disabled={disabled}
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Metadata fields */}
      {metadataFields.length > 0 && fileState.files.length > 0 && (
        <div className="space-y-4">
          <h4 className="font-medium text-sm text-gray-700">Additional Information</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {metadataFields.map((field) => (
              <div key={field.name} className="space-y-1">
                <Label htmlFor={field.name} className="text-sm">
                  {field.label} {field.required && '*'}
                </Label>
                {field.type === 'select' ? (
                  <select
                    id={field.name}
                    value={metadataState.values[field.name] || ''}
                    onChange={(e) => metadataActions.updateField(field.name, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={disabled}
                  >
                    <option value="">Select {field.label}</option>
                    {field.options?.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                ) : (
                  <Input
                    id={field.name}
                    type={field.type}
                    value={metadataState.values[field.name] || ''}
                    onChange={(e) => metadataActions.updateField(field.name, e.target.value)}
                    disabled={disabled}
                  />
                )}
                {metadataState.errors[field.name] && (
                  <p className="text-xs text-red-600">{metadataState.errors[field.name]}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload button */}
      {fileState.files.length > 0 && (
        <div className="flex justify-end">
          <Button
            onClick={handleUpload}
            disabled={disabled || fileState.isUploading || !metadataState.isValid}
            className="min-w-[120px]"
          >
            {fileState.isUploading ? 'Uploading...' : uploadButtonLabel}
          </Button>
        </div>
      )}
    </div>
  );
}; 