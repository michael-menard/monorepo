export interface FileUploadConfig {
    accept?: string | string[];
    maxSizeMB?: number;
    multiple?: boolean;
    onError?: ((error: string) => void) | undefined;
}
export interface FileUploadState {
    files: File[];
    isUploading: boolean;
    errors: string[];
}
export interface FileUploadActions {
    addFiles: (newFiles: File[]) => void;
    removeFile: (file: File) => void;
    clearFiles: () => void;
    upload: (metadata?: Record<string, any>) => Promise<void>;
    validateFiles: (files: File[]) => string[];
}
export declare const useFileUpload: (config: FileUploadConfig, onUpload: (files: File[] | File, metadata?: Record<string, any>) => Promise<void> | void) => {
    state: FileUploadState;
    actions: {
        addFiles: (newFiles: File[]) => void;
        removeFile: (file: File) => void;
        clearFiles: () => void;
        upload: (metadata?: Record<string, any>) => Promise<void>;
        validateFiles: (files: File[]) => string[];
    };
};
