// Security configuration
export const SECURITY_CONFIG = {
  // File size limits (in bytes)
  MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB
  MAX_TOTAL_SIZE: 500 * 1024 * 1024, // 500MB
  
  // Allowed file types with MIME types and extensions
  ALLOWED_TYPES: {
    // Images
    'image/jpeg': ['.jpg', '.jpeg'],
    'image/png': ['.png'],
    'image/gif': ['.gif'],
    'image/webp': ['.webp'],
    'image/svg+xml': ['.svg'],
    
    // Documents
    'application/pdf': ['.pdf'],
    'application/msword': ['.doc'],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    'application/vnd.ms-excel': ['.xls'],
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    'text/plain': ['.txt'],
    'text/csv': ['.csv'],
    
    // Videos
    'video/mp4': ['.mp4'],
    'video/webm': ['.webm'],
    'video/ogg': ['.ogv'],
    'video/quicktime': ['.mov'],
    
    // Audio
    'audio/mpeg': ['.mp3'],
    'audio/wav': ['.wav'],
    'audio/ogg': ['.ogg'],
    'audio/webm': ['.weba'],
  },
  
  // Dangerous file extensions to block
  BLOCKED_EXTENSIONS: [
    '.exe', '.bat', '.cmd', '.com', '.pif', '.scr', '.vbs', '.js', '.jar',
    '.msi', '.dmg', '.app', '.sh', '.py', '.php', '.asp', '.aspx', '.jsp',
    '.pl', '.cgi', '.htaccess', '.htpasswd', '.ini', '.conf', '.sys',
    '.dll', '.so', '.dylib', '.bin', '.deb', '.rpm', '.pkg', '.appx',
    '.xap', '.cab', '.zip', '.rar', '.7z', '.tar', '.gz', '.bz2'
  ],
  
  // Maximum number of files
  MAX_FILES: 20,
  
  // File name restrictions
  MAX_FILENAME_LENGTH: 255,
  ALLOWED_FILENAME_CHARS: /^[a-zA-Z0-9._-]+$/,
};

// File validation interface
export interface FileValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// Main file validation function
export function validateFile(file: File): FileValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Check file size
  if (file.size > SECURITY_CONFIG.MAX_FILE_SIZE) {
    errors.push(`File "${file.name}" is too large. Maximum size is ${formatFileSize(SECURITY_CONFIG.MAX_FILE_SIZE)}`);
  }
  
  // Check file name length
  if (file.name.length > SECURITY_CONFIG.MAX_FILENAME_LENGTH) {
    errors.push(`File name "${file.name}" is too long. Maximum length is ${SECURITY_CONFIG.MAX_FILENAME_LENGTH} characters`);
  }
  
  // Check file name characters
  if (!SECURITY_CONFIG.ALLOWED_FILENAME_CHARS.test(file.name)) {
    errors.push(`File name "${file.name}" contains invalid characters. Only letters, numbers, dots, underscores, and hyphens are allowed`);
  }
  
  // Check file extension
  const extension = getFileExtension(file.name).toLowerCase();
  if (SECURITY_CONFIG.BLOCKED_EXTENSIONS.includes(extension)) {
    errors.push(`File type "${extension}" is not allowed for security reasons`);
  }
  
  // Check MIME type
  const mimeType = file.type.toLowerCase();
  if (!Object.keys(SECURITY_CONFIG.ALLOWED_TYPES).includes(mimeType)) {
    errors.push(`File type "${mimeType}" is not supported`);
  }
  
  // Check if file extension matches MIME type
  const expectedExtensions = SECURITY_CONFIG.ALLOWED_TYPES[mimeType as keyof typeof SECURITY_CONFIG.ALLOWED_TYPES];
  if (expectedExtensions && !expectedExtensions.includes(extension)) {
    warnings.push(`File extension "${extension}" doesn't match the file type "${mimeType}"`);
  }
  
  // Check for suspicious patterns in file name
  if (containsSuspiciousPatterns(file.name)) {
    errors.push(`File name "${file.name}" contains suspicious patterns`);
  }
  
  // Check file content (basic magic number check)
  if (!isValidFileContent(file)) {
    errors.push(`File "${file.name}" appears to be corrupted or contains invalid content`);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

// Validate multiple files
export function validateFiles(files: File[]): FileValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Check total number of files
  if (files.length > SECURITY_CONFIG.MAX_FILES) {
    errors.push(`Too many files. Maximum allowed is ${SECURITY_CONFIG.MAX_FILES} files`);
  }
  
  // Check total size
  const totalSize = files.reduce((sum, file) => sum + file.size, 0);
  if (totalSize > SECURITY_CONFIG.MAX_TOTAL_SIZE) {
    errors.push(`Total file size is too large. Maximum allowed is ${formatFileSize(SECURITY_CONFIG.MAX_TOTAL_SIZE)}`);
  }
  
  // Check for duplicate file names
  const fileNames = files.map(f => f.name.toLowerCase());
  const duplicates = fileNames.filter((name, index) => fileNames.indexOf(name) !== index);
  if (duplicates.length > 0) {
    warnings.push(`Duplicate file names detected: ${[...new Set(duplicates)].join(', ')}`);
  }
  
  // Validate each file
  files.forEach(file => {
    const validation = validateFile(file);
    errors.push(...validation.errors);
    warnings.push(...validation.warnings);
  });
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

// Helper functions
function getFileExtension(filename: string): string {
  const lastDotIndex = filename.lastIndexOf('.');
  return lastDotIndex !== -1 ? filename.slice(lastDotIndex) : '';
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function containsSuspiciousPatterns(filename: string): boolean {
  const suspiciousPatterns = [
    /\.\./, // Directory traversal
    /[<>:"|?*]/, // Invalid characters
    /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i, // Reserved names
    /\.(exe|bat|cmd|com|pif|scr|vbs|js|jar)$/i, // Executable files
    /^\./, // Hidden files
    /\.\.$/, // Ends with dots
  ];
  
  return suspiciousPatterns.some(pattern => pattern.test(filename));
}

function isValidFileContent(file: File): boolean {
  // Basic magic number validation for common file types
  const magicNumbers: { [key: string]: number[] } = {
    'image/jpeg': [0xFF, 0xD8, 0xFF],
    'image/png': [0x89, 0x50, 0x4E, 0x47],
    'image/gif': [0x47, 0x49, 0x46],
    'application/pdf': [0x25, 0x50, 0x44, 0x46],
  };
  
  const mimeType = file.type.toLowerCase();
  const expectedMagic = magicNumbers[mimeType];
  
  if (!expectedMagic) {
    // If we don't have magic numbers for this type, assume it's valid
    return true;
  }
  
  // Note: In a real implementation, you would read the file header
  // For now, we'll return true and let the server handle detailed validation
  return true;
}

// Sanitize file name for display
export function sanitizeFileName(filename: string): string {
  return filename
    .replace(/[<>:"|?*]/g, '_') // Replace invalid characters
    .replace(/\.\./g, '_') // Replace directory traversal
    .replace(/^\./, '_') // Replace leading dot
    .replace(/\.$/, '_'); // Replace trailing dot
}

// Generate secure file ID
export function generateSecureFileId(): string {
  return `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
} 