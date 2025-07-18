import multer from 'multer';
import { localStorage, getLocalAvatarUrl, deleteLocalAvatar } from './local';
import { uploadAvatarToS3, deleteAvatarFromS3 } from './s3';

const USE_S3 = process.env.NODE_ENV !== 'development';

export const avatarUpload = multer({
  storage: USE_S3 ? multer.memoryStorage() : localStorage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB to match AvatarUploader component
  fileFilter: (req, file, cb) => {
    if (["image/jpeg", "image/jpg", "image/png", "image/heic"].includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only JPEG, PNG, and HEIC files are supported"));
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