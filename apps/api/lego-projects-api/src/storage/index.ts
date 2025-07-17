import multer from 'multer';
import { localStorage, getLocalAvatarUrl, deleteLocalAvatar } from './local';
import { uploadAvatarToS3, deleteAvatarFromS3 } from './s3';

const USE_S3 = process.env.NODE_ENV !== 'development';

export const avatarUpload = multer({
  storage: USE_S3 ? multer.memoryStorage() : localStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (["image/jpeg", "image/heic"].includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only .jpg or .heic files are supported"));
    }
  },
});

export async function saveAvatar(userId: string, file: Express.Multer.File): Promise<string> {
  if (USE_S3) {
    return uploadAvatarToS3(userId, file);
  } else {
    return getLocalAvatarUrl(file.filename);
  }
}

export async function deleteAvatar(avatarUrl: string): Promise<void> {
  if (USE_S3) {
    await deleteAvatarFromS3(avatarUrl);
  } else {
    deleteLocalAvatar(avatarUrl);
  }
} 