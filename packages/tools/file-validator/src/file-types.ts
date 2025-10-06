import type { FileTypeRegistry, MagicBytesMap } from './types.js';

// Predefined file type configurations
export const FILE_TYPES: FileTypeRegistry = {
  // Images
  'image-jpeg': {
    name: 'JPEG Image',
    mimeTypes: ['image/jpeg', 'image/jpg'],
    extensions: ['.jpg', '.jpeg'],
    maxSize: 20 * 1024 * 1024, // 20MB
    description: 'JPEG image file',
    magicBytes: [[0xFF, 0xD8, 0xFF]]
  },
  'image-png': {
    name: 'PNG Image',
    mimeTypes: ['image/png'],
    extensions: ['.png'],
    maxSize: 20 * 1024 * 1024, // 20MB
    description: 'PNG image file',
    magicBytes: [[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]]
  },
  'image-webp': {
    name: 'WebP Image',
    mimeTypes: ['image/webp'],
    extensions: ['.webp'],
    maxSize: 20 * 1024 * 1024, // 20MB
    description: 'WebP image file',
    magicBytes: [[0x52, 0x49, 0x46, 0x46], [0x57, 0x45, 0x42, 0x50]]
  },
  'image-heic': {
    name: 'HEIC Image',
    mimeTypes: ['image/heic', 'image/heif'],
    extensions: ['.heic', '.heif'],
    maxSize: 20 * 1024 * 1024, // 20MB
    description: 'HEIC/HEIF image file'
  },

  // Documents
  'document-pdf': {
    name: 'PDF Document',
    mimeTypes: ['application/pdf'],
    extensions: ['.pdf'],
    maxSize: 50 * 1024 * 1024, // 50MB
    description: 'PDF document',
    magicBytes: [[0x25, 0x50, 0x44, 0x46]]
  },
  'document-text': {
    name: 'Text File',
    mimeTypes: ['text/plain'],
    extensions: ['.txt'],
    maxSize: 10 * 1024 * 1024, // 10MB
    description: 'Plain text file'
  },

  // Data files
  'data-csv': {
    name: 'CSV File',
    mimeTypes: ['text/csv', 'application/csv', 'application/octet-stream'],
    extensions: ['.csv'],
    maxSize: 10 * 1024 * 1024, // 10MB
    description: 'Comma-separated values file'
  },
  'data-json': {
    name: 'JSON File',
    mimeTypes: ['application/json', 'text/json'],
    extensions: ['.json'],
    maxSize: 10 * 1024 * 1024, // 10MB
    description: 'JSON data file'
  },
  'data-xml': {
    name: 'XML File',
    mimeTypes: ['application/xml', 'text/xml'],
    extensions: ['.xml'],
    maxSize: 10 * 1024 * 1024, // 10MB
    description: 'XML data file'
  },

  // Specialized files
  'lego-instruction': {
    name: 'LEGO Instruction File',
    mimeTypes: ['application/pdf', 'application/octet-stream'],
    extensions: ['.pdf', '.io'],
    maxSize: 50 * 1024 * 1024, // 50MB
    description: 'LEGO instruction file (PDF or Stud.io)'
  },
  'lego-parts-list': {
    name: 'LEGO Parts List',
    mimeTypes: ['text/csv', 'application/json', 'text/plain', 'application/xml', 'text/xml', 'application/octet-stream'],
    extensions: ['.csv', '.json', '.txt', '.xml'],
    maxSize: 10 * 1024 * 1024, // 10MB
    description: 'LEGO parts list file'
  }
};

// Magic bytes for file type detection
export const MAGIC_BYTES: MagicBytesMap = {
  'image/jpeg': [[0xFF, 0xD8, 0xFF]],
  'image/png': [[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]],
  'image/webp': [[0x52, 0x49, 0x46, 0x46], [0x57, 0x45, 0x42, 0x50]],
  'application/pdf': [[0x25, 0x50, 0x44, 0x46]],
  'image/gif': [[0x47, 0x49, 0x46, 0x38]],
  'image/bmp': [[0x42, 0x4D]],
  'image/tiff': [[0x49, 0x49, 0x2A, 0x00], [0x4D, 0x4D, 0x00, 0x2A]]
};

// File type categories for easy grouping
export const FILE_CATEGORIES = {
  images: ['image-jpeg', 'image-png', 'image-webp', 'image-heic'],
  documents: ['document-pdf', 'document-text'],
  data: ['data-csv', 'data-json', 'data-xml'],
  lego: ['lego-instruction', 'lego-parts-list']
} as const;

// Helper functions
export function getFileTypeByExtension(extension: string): string | null {
  const normalizedExt = extension.toLowerCase();
  for (const [key, config] of Object.entries(FILE_TYPES)) {
    if (config.extensions.includes(normalizedExt)) {
      return key;
    }
  }
  return null;
}

export function getFileTypeByMimeType(mimeType: string): string | null {
  for (const [key, config] of Object.entries(FILE_TYPES)) {
    if (config.mimeTypes.includes(mimeType)) {
      return key;
    }
  }
  return null;
}

export function getFileTypesForCategory(category: keyof typeof FILE_CATEGORIES): string[] {
  return FILE_CATEGORIES[category] || [];
}
