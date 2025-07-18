import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';

const uploadsDir = 'uploads';
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

export const localStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `avatar-${uuidv4()}${ext}`);
  },
});

export function getLocalAvatarUrl(filename: string): string {
  return `/uploads/${filename}`;
}

export function deleteLocalAvatar(avatarUrl: string): void {
  const filePath = path.join(process.cwd(), avatarUrl.startsWith('/') ? avatarUrl.substring(1) : avatarUrl);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

// Gallery image storage with directory structure
export const galleryLocalStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Assume req.user.id is available via auth middleware, fallback to 'unknown'
    const userId = req.user?.id || 'unknown';
    // Album ID can be passed as req.body.albumId or default to 'uncategorized'
    const albumId = req.body?.albumId || 'uncategorized';
    const dir = path.join(uploadsDir, 'gallery', userId, albumId);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
}); 