import React from 'react';
import { MetadataField } from './hooks';
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
export declare const FileUpload: React.FC<FileUploadProps>;
