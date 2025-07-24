import React from 'react';
interface ImageUploadModalProps {
    open: boolean;
    onClose: () => void;
    onSubmit: (data: {
        file: File;
        title: string;
        description: string;
        tags?: string[];
        extra?: Record<string, any>;
    }) => void;
    isLoading?: boolean;
    onUploadProgress?: (progress: number) => void;
    renderExtraFields?: (extra: Record<string, any>, setExtra: (v: Record<string, any>) => void) => React.ReactNode;
    theme?: 'light' | 'dark';
    maxFileSizeMB?: number;
    acceptedFormats?: string[];
    showTags?: boolean;
}
declare const ImageUploadModal: React.FC<ImageUploadModalProps>;
export default ImageUploadModal;
