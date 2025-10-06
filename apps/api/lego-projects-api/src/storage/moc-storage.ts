import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { processImage, canProcessImage, THUMBNAIL_CONFIG } from '../utils/imageProcessor';
import fs from 'fs';

// S3 Configuration
const BUCKET = process.env.S3_BUCKET!;
const REGION = process.env.S3_REGION!;
const s3 = new S3Client({ region: REGION });

const USE_S3 = process.env.NODE_ENV !== 'development';

// File type configurations
export const MOC_FILE_TYPES = {
  INSTRUCTION: 'instruction',
  PARTS_LIST: 'parts-list',
  THUMBNAIL: 'thumbnail',
  GALLERY_IMAGE: 'gallery-image',
} as const;

export type MocFileType = (typeof MOC_FILE_TYPES)[keyof typeof MOC_FILE_TYPES];

export const ALLOWED_FILE_EXTENSIONS: Record<MocFileType, string[]> = {
  [MOC_FILE_TYPES.INSTRUCTION]: ['.pdf', '.io'],
  [MOC_FILE_TYPES.PARTS_LIST]: ['.csv', '.json', '.txt', '.xml'],
  [MOC_FILE_TYPES.THUMBNAIL]: ['.jpg', '.jpeg', '.png', '.webp', '.heic'],
  [MOC_FILE_TYPES.GALLERY_IMAGE]: ['.jpg', '.jpeg', '.png', '.webp', '.heic'],
};

export const ALLOWED_MIME_TYPES: Record<MocFileType, string[]> = {
  [MOC_FILE_TYPES.INSTRUCTION]: ['application/pdf', 'application/octet-stream'],
  [MOC_FILE_TYPES.PARTS_LIST]: ['text/csv', 'application/json', 'text/plain', 'application/xml', 'text/xml', 'application/octet-stream'],
  [MOC_FILE_TYPES.THUMBNAIL]: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic'],
  [MOC_FILE_TYPES.GALLERY_IMAGE]: [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/heic',
  ],
};

// Local storage configuration for MOC files
const mocLocalStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const userId = req.user?.sub;
    const fileType = req.body.fileType || MOC_FILE_TYPES.INSTRUCTION;
    const uploadPath = `uploads/moc-files/${userId}/${fileType}`;
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, ext);
    // Sanitize filename: replace spaces and special characters with hyphens
    const sanitizedBaseName = baseName.replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-');
    const uniqueId = uuidv4();
    cb(null, `${sanitizedBaseName}-${uniqueId}${ext}`);
  },
});

// Local storage configuration specifically for parts list files
const partsListLocalStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const userId = req.user?.sub;
    const uploadPath = `uploads/moc-files/${userId}/${MOC_FILE_TYPES.PARTS_LIST}`;

    // Ensure directory exists
    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, ext);
    // Sanitize filename: replace spaces and special characters with hyphens
    const sanitizedBaseName = baseName.replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-');
    const uniqueId = uuidv4();
    cb(null, `${sanitizedBaseName}-${uniqueId}${ext}`);
  },
});

// Multer configuration for MOC file uploads
export const mocFileUpload = multer({
  storage: USE_S3 ? multer.memoryStorage() : mocLocalStorage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB for instruction files
  },
  fileFilter: (req, file, cb) => {
    const fileType = req.body.fileType || MOC_FILE_TYPES.INSTRUCTION;
    const allowedMimeTypes = ALLOWED_MIME_TYPES[fileType as MocFileType];

    if (!allowedMimeTypes) {
      return cb(new Error(`Invalid file type: ${fileType}`));
    }

    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} not allowed for ${fileType}`));
    }
  },
});

// Multer configuration specifically for parts list uploads
export const partsListUpload = multer({
  storage: USE_S3 ? multer.memoryStorage() : partsListLocalStorage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB for parts list files
  },
  fileFilter: (req, file, cb) => {
    // For parts list uploads, validate both MIME type and file extension
    const allowedMimeTypes = ALLOWED_MIME_TYPES[MOC_FILE_TYPES.PARTS_LIST];
    const allowedExtensions = ALLOWED_FILE_EXTENSIONS[MOC_FILE_TYPES.PARTS_LIST];

    // Check file extension
    const fileExtension = '.' + file.originalname.split('.').pop()?.toLowerCase();
    const hasValidExtension = allowedExtensions.includes(fileExtension);

    // Check MIME type or allow if extension is valid (handles MIME type detection issues)
    const hasValidMimeType = allowedMimeTypes.includes(file.mimetype);

    if (hasValidMimeType || hasValidExtension) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} with extension ${fileExtension} not allowed for parts list. Allowed extensions: ${allowedExtensions.join(', ')}`));
    }
  },
});

// Enhanced multer configuration for modal file uploads (multiple file types)
export const mocModalUpload = multer({
  storage: USE_S3 ? multer.memoryStorage() : multer.diskStorage({
    destination: (req, file, cb) => {
      const userId = req.user?.id;
      let subDir = 'misc';

      // Determine subdirectory based on field name
      if (file.fieldname === 'instructionsFile') {
        subDir = 'instructions';
      } else if (file.fieldname === 'partsLists') {
        subDir = 'parts-lists';
      } else if (file.fieldname === 'images') {
        subDir = 'images';
      }

      const uploadPath = `uploads/moc-files/${userId}/${subDir}`;

      // Ensure directory exists
      const fs = require('fs');
      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
      }

      cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      const baseName = path.basename(file.originalname, ext);
      // Sanitize filename: replace spaces and special characters with hyphens
      const sanitizedBaseName = baseName.replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-');
      const uniqueId = uuidv4();
      cb(null, `${sanitizedBaseName}-${uniqueId}${ext}`);
    },
  }),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB max file size
    files: 25, // Max 25 files total (10 instructions + 10 parts lists + 3 images + buffer)
  },
  fileFilter: (req, file, cb) => {
    console.log('🔍 File filter - fieldname:', file.fieldname, 'mimetype:', file.mimetype);

    // Validate based on field name
    if (file.fieldname === 'instructionsFile') {
      // Instructions: PDF and .io files
      if (['application/pdf', 'application/octet-stream'].includes(file.mimetype) ||
          file.originalname.endsWith('.io')) {
        cb(null, true);
      } else {
        cb(new Error('Instructions file must be PDF or .io format'));
      }
    } else if (file.fieldname === 'partsLists') {
      // Parts lists: PDF, CSV, Excel, Text
      if ([
        'application/pdf',
        'text/csv',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain'
      ].includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Parts list files must be PDF, CSV, Excel, or text format'));
      }
    } else if (file.fieldname === 'images') {
      // Images: JPEG, JPG, HEIC, PNG
      if ([
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/heic'
      ].includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Images must be JPEG, JPG, PNG, or HEIC format'));
      }
    } else {
      cb(new Error(`Unexpected field: ${file.fieldname}`));
    }
  },
});

// S3 Upload functions
export async function uploadMocFileToS3(
  userId: string,
  mocId: string,
  fileType: string,
  file: Express.Multer.File,
): Promise<string> {
  const ext = path.extname(file.originalname);
  const key = `moc-files/${userId}/${mocId}/${fileType}/${uuidv4()}${ext}`;

  let fileBuffer = file.buffer;
  let contentType = file.mimetype;
  let finalExt = ext;

  // Process images if needed
  if (fileType === MOC_FILE_TYPES.THUMBNAIL || fileType === MOC_FILE_TYPES.GALLERY_IMAGE) {
    if (canProcessImage(file.mimetype)) {
      try {
        fileBuffer = await processImage(file.buffer, THUMBNAIL_CONFIG);
        contentType = 'image/jpeg';
        finalExt = '.jpg';
      } catch (error) {
        console.error('Image processing failed, using original:', error);
      }
    }
  }

  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: fileBuffer,
      ContentType: contentType,
      ACL: 'private', // MOC files are private to the user
    }),
  );

  return `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`;
}

export async function deleteMocFileFromS3(fileUrl: string): Promise<void> {
  const match = fileUrl.match(/\/moc-files\/.*$/);
  if (!match) return;

  const key = match[0].replace(/^\//, '');
  await s3.send(
    new DeleteObjectCommand({
      Bucket: BUCKET,
      Key: key,
    }),
  );
}

export async function getMocFileSignedUrl(
  fileUrl: string,
  expiresIn: number = 3600,
): Promise<string> {
  const match = fileUrl.match(/\/moc-files\/.*$/);
  if (!match) throw new Error('Invalid MOC file URL');

  const key = match[0].replace(/^\//, '');
  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: key,
  });

  return await getSignedUrl(s3, command, { expiresIn });
}

// Local storage functions
export function getLocalMocFileUrl(filePath: string): string {
  return `/uploads/moc-files/${filePath}`;
}

export function deleteLocalMocFile(filePath: string): void {
  const fullPath = path.join(process.cwd(), 'uploads', 'moc-files', filePath);

  if (fs.existsSync(fullPath)) {
    fs.unlinkSync(fullPath);
  }
}

// Enhanced file download functionality
export interface FileDownloadInfo {
  url: string;
  filename: string;
  mimeType: string;
  size?: number;
  expiresAt?: Date;
}

export async function getMocFileDownloadInfo(
  fileUrl: string,
  originalFilename: string,
  mimeType: string,
  expiresIn: number = 3600,
): Promise<FileDownloadInfo> {
  if (USE_S3) {
    const signedUrl = await getMocFileSignedUrl(fileUrl, expiresIn);
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    return {
      url: signedUrl,
      filename: originalFilename,
      mimeType,
      expiresAt,
    };
  } else {
    // For local development, return the file path
    return {
      url: fileUrl,
      filename: originalFilename,
      mimeType,
    };
  }
}

// Stream file for direct download (for local files)
export function streamLocalMocFile(
  fileUrl: string,
): { stream: fs.ReadStream; filename: string; mimeType: string } | null {
  try {
    // Extract local path from URL
    const localPath = fileUrl.replace('/uploads/moc-files/', '');
    const fullPath = path.join(process.cwd(), 'uploads', 'moc-files', localPath);

    if (!fs.existsSync(fullPath)) {
      return null;
    }

    const stats = fs.statSync(fullPath);
    const stream = fs.createReadStream(fullPath);

    // Determine MIME type from file extension
    const ext = path.extname(fullPath).toLowerCase();
    let mimeType = 'application/octet-stream';

    if (ext === '.pdf') mimeType = 'application/pdf';
    else if (ext === '.csv') mimeType = 'text/csv';
    else if (ext === '.json') mimeType = 'application/json';
    else if (ext === '.txt') mimeType = 'text/plain';
    else if (['.jpg', '.jpeg'].includes(ext)) mimeType = 'image/jpeg';
    else if (ext === '.png') mimeType = 'image/png';
    else if (ext === '.webp') mimeType = 'image/webp';
    else if (ext === '.heic') mimeType = 'image/heic';
    else if (ext === '.io') mimeType = 'application/octet-stream';

    return {
      stream,
      filename: path.basename(fullPath),
      mimeType,
    };
  } catch (error) {
    console.error('Error streaming local file:', error);
    return null;
  }
}

// Check if file exists
export async function checkMocFileExists(fileUrl: string): Promise<boolean> {
  if (USE_S3) {
    try {
      const match = fileUrl.match(/\/moc-files\/.*$/);
      if (!match) return false;

      const key = match[0].replace(/^\//, '');
      await s3.send(
        new GetObjectCommand({
          Bucket: BUCKET,
          Key: key,
        }),
      );
      return true;
    } catch (error) {
      return false;
    }
  } else {
    const localPath = fileUrl.replace('/uploads/moc-files/', '');
    const fullPath = path.join(process.cwd(), 'uploads', 'moc-files', localPath);
    return fs.existsSync(fullPath);
  }
}

// Main storage interface
export async function saveMocFile(
  userId: string,
  mocId: string,
  fileType: string,
  file: Express.Multer.File,
): Promise<string> {
  if (USE_S3) {
    return uploadMocFileToS3(userId, mocId, fileType, file);
  } else {
    return getLocalMocFileUrl(file.filename);
  }
}

export async function deleteMocFile(fileUrl: string): Promise<void> {
  if (USE_S3) {
    await deleteMocFileFromS3(fileUrl);
  } else {
    // Extract local path from URL
    const localPath = fileUrl.replace('/uploads/moc-files/', '');
    deleteLocalMocFile(localPath);
  }
}

export async function getMocFileDownloadUrl(fileUrl: string): Promise<string> {
  if (USE_S3) {
    return getMocFileSignedUrl(fileUrl);
  } else {
    // For local development, return the file path
    return fileUrl;
  }
}

// Validation utilities
export function validateFileType(fileType: string): fileType is MocFileType {
  return Object.values(MOC_FILE_TYPES).includes(fileType as MocFileType);
}

export function validateFileExtension(filename: string, fileType: MocFileType): boolean {
  const ext = path.extname(filename).toLowerCase();
  const allowedExtensions = ALLOWED_FILE_EXTENSIONS[fileType];
  return allowedExtensions.includes(ext);
}

export function validateMimeType(mimetype: string, fileType: MocFileType): boolean {
  const allowedMimeTypes = ALLOWED_MIME_TYPES[fileType];
  return allowedMimeTypes.includes(mimetype);
}
