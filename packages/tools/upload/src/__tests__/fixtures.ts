import type { 
  UploadFile, 
  UploadConfig, 
  ValidationError, 
  UploadProgress,
  ImageProcessingOptions,
  UploadPreset 
} from '../types/index.js';

// File fixtures
export const fileFixtures = {
  // Valid image files
  jpegImage: new File(['jpeg content'], 'photo.jpg', { 
    type: 'image/jpeg',
    lastModified: Date.now() - 1000 * 60 * 60 // 1 hour ago
  }),
  
  pngImage: new File(['png content'], 'screenshot.png', { 
    type: 'image/png',
    lastModified: Date.now() - 1000 * 60 * 30 // 30 minutes ago
  }),
  
  webpImage: new File(['webp content'], 'modern.webp', { 
    type: 'image/webp',
    lastModified: Date.now() - 1000 * 60 * 15 // 15 minutes ago
  }),

  // Document files
  pdfDocument: new File(['pdf content'], 'document.pdf', { 
    type: 'application/pdf',
    lastModified: Date.now() - 1000 * 60 * 5 // 5 minutes ago
  }),
  
  wordDocument: new File(['docx content'], 'report.docx', { 
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    lastModified: Date.now() - 1000 * 60 * 2 // 2 minutes ago
  }),

  // Video files
  mp4Video: new File(['mp4 content'], 'video.mp4', { 
    type: 'video/mp4',
    lastModified: Date.now() - 1000 * 60 * 60 * 2 // 2 hours ago
  }),

  // Audio files
  mp3Audio: new File(['mp3 content'], 'audio.mp3', { 
    type: 'audio/mpeg',
    lastModified: Date.now() - 1000 * 60 * 45 // 45 minutes ago
  }),

  // Invalid/problematic files
  executableFile: new File(['exe content'], 'virus.exe', { 
    type: 'application/x-msdownload',
    lastModified: Date.now() - 1000 * 60 * 10 // 10 minutes ago
  }),
  
  emptyFile: new File([''], 'empty.txt', { 
    type: 'text/plain',
    lastModified: Date.now() - 1000 * 60 // 1 minute ago
  }),

  // Large files (mock size property)
  get largeImage() {
    const file = new File(['large image'], 'large.jpg', { type: 'image/jpeg' });
    Object.defineProperty(file, 'size', { value: 50 * 1024 * 1024 }); // 50MB
    return file;
  },

  get hugePdf() {
    const file = new File(['huge pdf'], 'huge.pdf', { type: 'application/pdf' });
    Object.defineProperty(file, 'size', { value: 200 * 1024 * 1024 }); // 200MB
    return file;
  },

  // File arrays for multi-upload testing
  get multipleImages() {
    return [this.jpegImage, this.pngImage, this.webpImage];
  },

  get mixedFiles() {
    return [this.jpegImage, this.pdfDocument, this.mp4Video];
  },

  get tooManyFiles() {
    return Array.from({ length: 15 }, (_, i) => 
      new File([`content ${i}`], `file-${i}.jpg`, { type: 'image/jpeg' })
    );
  }
};

// Add size properties to standard files
Object.defineProperty(fileFixtures.jpegImage, 'size', { value: 2 * 1024 * 1024 }); // 2MB
Object.defineProperty(fileFixtures.pngImage, 'size', { value: 3 * 1024 * 1024 }); // 3MB
Object.defineProperty(fileFixtures.webpImage, 'size', { value: 1.5 * 1024 * 1024 }); // 1.5MB
Object.defineProperty(fileFixtures.pdfDocument, 'size', { value: 5 * 1024 * 1024 }); // 5MB
Object.defineProperty(fileFixtures.wordDocument, 'size', { value: 2.5 * 1024 * 1024 }); // 2.5MB
Object.defineProperty(fileFixtures.mp4Video, 'size', { value: 25 * 1024 * 1024 }); // 25MB
Object.defineProperty(fileFixtures.mp3Audio, 'size', { value: 8 * 1024 * 1024 }); // 8MB
Object.defineProperty(fileFixtures.executableFile, 'size', { value: 1024 }); // 1KB
Object.defineProperty(fileFixtures.emptyFile, 'size', { value: 0 }); // 0 bytes

// Upload file fixtures
export const uploadFileFixtures = {
  pending: {
    id: 'upload-1',
    file: fileFixtures.jpegImage,
    status: 'pending' as const,
    progress: 0,
  },

  uploading: {
    id: 'upload-2',
    file: fileFixtures.pngImage,
    status: 'uploading' as const,
    progress: 45,
  },

  processing: {
    id: 'upload-3',
    file: fileFixtures.webpImage,
    status: 'processing' as const,
    progress: 100,
  },

  completed: {
    id: 'upload-4',
    file: fileFixtures.pdfDocument,
    status: 'completed' as const,
    progress: 100,
    url: 'https://cdn.example.com/uploads/document.pdf',
    metadata: {
      width: 800,
      height: 600,
      format: 'pdf',
      size: 5 * 1024 * 1024,
    },
  },

  error: {
    id: 'upload-5',
    file: fileFixtures.largeImage,
    status: 'error' as const,
    progress: 0,
    error: 'File size exceeds maximum limit',
  },

  cancelled: {
    id: 'upload-6',
    file: fileFixtures.mp4Video,
    status: 'cancelled' as const,
    progress: 25,
  },
} satisfies Record<string, UploadFile>;

// Upload configuration fixtures
export const configFixtures = {
  default: {
    maxFiles: 10,
    maxFileSize: 10 * 1024 * 1024, // 10MB
    acceptedFileTypes: ['*/*'],
    multiple: true,
    autoUpload: false,
  },

  imagesOnly: {
    maxFiles: 5,
    maxFileSize: 5 * 1024 * 1024, // 5MB
    acceptedFileTypes: ['image/*'],
    multiple: true,
    autoUpload: false,
  },

  singleFile: {
    maxFiles: 1,
    maxFileSize: 2 * 1024 * 1024, // 2MB
    acceptedFileTypes: ['image/jpeg', 'image/png'],
    multiple: false,
    autoUpload: true,
    endpoint: '/api/upload/single',
  },

  documents: {
    maxFiles: 3,
    maxFileSize: 50 * 1024 * 1024, // 50MB
    acceptedFileTypes: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    multiple: true,
    autoUpload: false,
  },

  restrictive: {
    maxFiles: 1,
    maxFileSize: 1024 * 1024, // 1MB
    acceptedFileTypes: ['image/jpeg'],
    multiple: false,
    autoUpload: false,
  },

  withEndpoint: {
    maxFiles: 5,
    maxFileSize: 10 * 1024 * 1024,
    acceptedFileTypes: ['image/*'],
    multiple: true,
    autoUpload: true,
    endpoint: 'https://api.example.com/upload',
    headers: {
      'Authorization': 'Bearer token123',
      'X-API-Key': 'key456',
    },
  },
} satisfies Record<string, UploadConfig>;

// Validation error fixtures
export const validationErrorFixtures = {
  invalidType: {
    code: 'INVALID_FILE_TYPE',
    message: 'File type application/x-msdownload is not accepted. Accepted types: image/*',
    file: fileFixtures.executableFile,
  },

  fileTooLarge: {
    code: 'FILE_TOO_LARGE',
    message: 'File size 52.4 MB exceeds maximum allowed size of 10 MB',
    file: fileFixtures.largeImage,
  },

  tooManyFiles: {
    code: 'TOO_MANY_FILES',
    message: 'Cannot upload 15 files. Maximum allowed: 10',
  },

  emptyFile: {
    code: 'EMPTY_FILE',
    message: 'File is empty and cannot be uploaded',
    file: fileFixtures.emptyFile,
  },

  networkError: {
    code: 'NETWORK_ERROR',
    message: 'Network connection failed during upload',
  },

  serverError: {
    code: 'SERVER_ERROR',
    message: 'Server returned error: Internal Server Error',
  },
} satisfies Record<string, ValidationError>;

// Upload progress fixtures
export const progressFixtures = {
  starting: {
    percentage: 0,
    loaded: 0,
    total: 2 * 1024 * 1024,
  },

  quarter: {
    percentage: 25,
    loaded: 0.5 * 1024 * 1024,
    total: 2 * 1024 * 1024,
  },

  half: {
    percentage: 50,
    loaded: 1 * 1024 * 1024,
    total: 2 * 1024 * 1024,
  },

  almostDone: {
    percentage: 90,
    loaded: 1.8 * 1024 * 1024,
    total: 2 * 1024 * 1024,
  },

  complete: {
    percentage: 100,
    loaded: 2 * 1024 * 1024,
    total: 2 * 1024 * 1024,
  },
} satisfies Record<string, UploadProgress>;

// Image processing options fixtures
export const imageProcessingFixtures = {
  resize: {
    width: 800,
    height: 600,
    fit: 'cover' as const,
    quality: 85,
    format: 'jpeg' as const,
  },

  thumbnail: {
    width: 150,
    height: 150,
    fit: 'cover' as const,
    quality: 90,
    format: 'webp' as const,
  },

  compress: {
    quality: 60,
    format: 'jpeg' as const,
  },

  convert: {
    format: 'webp' as const,
    quality: 85,
  },
} satisfies Record<string, ImageProcessingOptions>;

// Upload preset fixtures
export const presetFixtures = {
  avatar: {
    name: 'Avatar',
    maxFileSize: 5 * 1024 * 1024,
    acceptedFileTypes: ['image/jpeg', 'image/png'],
    imageProcessing: {
      width: 200,
      height: 200,
      fit: 'cover',
      quality: 90,
    },
    validation: {
      minWidth: 100,
      minHeight: 100,
      maxWidth: 2000,
      maxHeight: 2000,
      aspectRatio: 1,
    },
  },

  gallery: {
    name: 'Gallery',
    maxFileSize: 10 * 1024 * 1024,
    acceptedFileTypes: ['image/*'],
    imageProcessing: {
      width: 800,
      height: 800,
      fit: 'inside',
      quality: 85,
    },
  },

  document: {
    name: 'Document',
    maxFileSize: 50 * 1024 * 1024,
    acceptedFileTypes: ['application/pdf', 'application/msword'],
  },
} satisfies Record<string, UploadPreset>;

// Server response fixtures
export const serverResponseFixtures = {
  success: {
    url: 'https://cdn.example.com/uploads/file-abc123.jpg',
    metadata: {
      width: 800,
      height: 600,
      format: 'jpeg',
      size: 2 * 1024 * 1024,
    },
  },

  error: {
    error: 'Upload failed',
    code: 'UPLOAD_ERROR',
    message: 'Server temporarily unavailable',
  },

  validation: {
    error: 'Validation failed',
    code: 'VALIDATION_ERROR',
    message: 'File type not allowed',
    details: {
      field: 'file',
      rejectedType: 'application/x-msdownload',
      allowedTypes: ['image/*'],
    },
  },
};
