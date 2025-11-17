import multer from 'multer'
import { galleryLocalStorage } from './local'

const USE_S3 = process.env.NODE_ENV !== 'development'

export const galleryUpload = multer({
  storage: USE_S3 ? multer.memoryStorage() : galleryLocalStorage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    if (
      ['image/jpeg', 'image/jpg', 'image/png', 'image/heic', 'image/webp'].includes(file.mimetype)
    ) {
      cb(null, true)
    } else {
      cb(new Error('Only JPEG, PNG, HEIC, and WebP files are supported'))
    }
  },
})
