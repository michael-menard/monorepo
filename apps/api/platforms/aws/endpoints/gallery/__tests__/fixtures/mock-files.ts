/**
 * Mock File Data for Tests
 */

export const mockFiles = {
  pdfInstruction: {
    id: 'file-pdf-123',
    mocId: 'moc-basic-123',
    fileType: 'instruction' as const,
    fileUrl: 'https://bucket.s3.amazonaws.com/mocs/user-123/moc-basic-123/instructions.pdf',
    originalFilename: 'castle-instructions.pdf',
    mimeType: 'application/pdf',
    fileSize: 5242880, // 5MB
    createdAt: new Date('2024-01-01'),
  },

  csvPartsList: {
    id: 'file-csv-456',
    mocId: 'moc-basic-123',
    fileType: 'parts-list' as const,
    fileUrl: 'https://bucket.s3.amazonaws.com/mocs/user-123/moc-basic-123/parts.csv',
    originalFilename: 'parts-list.csv',
    mimeType: 'text/csv',
    fileSize: 102400, // 100KB
    createdAt: new Date('2024-01-01'),
  },

  thumbnail: {
    id: 'file-thumb-789',
    mocId: 'moc-basic-123',
    fileType: 'thumbnail' as const,
    fileUrl: 'https://bucket.s3.amazonaws.com/mocs/user-123/moc-basic-123/thumbnail.jpg',
    originalFilename: 'castle-thumb.jpg',
    mimeType: 'image/jpeg',
    fileSize: 512000, // 500KB
    createdAt: new Date('2024-01-01'),
  },
}

/**
 * Mock file upload buffers
 */
export const mockFileBuffers = {
  smallPdf: Buffer.from('%PDF-1.4\n%mock pdf content\n%%EOF'),
  smallCsv: Buffer.from('part_number,quantity,name\n1234,2,Brick 2x4\n5678,4,Plate 1x2'),
  smallJpeg: Buffer.from('\xFF\xD8\xFF\xE0\x00\x10JFIF'),
}

/**
 * Mock file upload metadata
 */
export const mockFileUploadMetadata = {
  validPdf: {
    filename: 'instructions.pdf',
    mimeType: 'application/pdf',
    size: 5242880, // 5MB
    fileType: 'instruction' as const,
  },

  validCsv: {
    filename: 'parts-list.csv',
    mimeType: 'text/csv',
    size: 102400, // 100KB
    fileType: 'parts-list' as const,
  },

  oversized: {
    filename: 'huge-file.pdf',
    mimeType: 'application/pdf',
    size: 15728640, // 15MB (exceeds 10MB limit)
    fileType: 'instruction' as const,
  },

  invalidMimeType: {
    filename: 'malware.exe',
    mimeType: 'application/x-msdownload',
    size: 1024000, // 1MB
    fileType: 'instruction' as const,
  },

  missingExtension: {
    filename: 'README',
    mimeType: 'text/plain',
    size: 1024, // 1KB
    fileType: 'instruction' as const,
  },
}

/**
 * Mock S3 keys
 */
export const mockS3Keys = {
  instruction: 'mocs/user-123/moc-basic-123/uuid-123.pdf',
  partsList: 'mocs/user-123/moc-basic-123/uuid-456.csv',
  thumbnail: 'mocs/user-123/moc-basic-123/uuid-789.jpg',
}
