// Main entry point - exports everything for Node.js and browser environments

// Export all components
export * from './components/index.js';

// Export all hooks
export * from './hooks/index.js';

// Export all utilities (including backend image processing)
export * from './utils/index.js';

// Export all types
export * from './types/index.js';

// Export all schemas
export * from './schemas/index.js';

// Re-export commonly used items for convenience
export { Upload } from './components/Upload/Upload.js';
export { useUpload } from './hooks/useUpload.js';
export { UPLOAD_PRESETS } from './utils/presets.js';
