import path from 'path'
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { v4 as uuidv4 } from 'uuid'

const BUCKET = process.env.S3_BUCKET!
const REGION = process.env.S3_REGION!
const s3 = new S3Client({ region: REGION })

export async function uploadWishlistImageToS3(
  userId: string,
  file: Express.Multer.File,
): Promise<string> {
  const ext = path.extname(file.originalname)
  const key = `wishlist/${userId}/wishlist-${uuidv4()}${ext}`
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
      ACL: 'public-read',
    }),
  )
  // Return the S3 URL
  return `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`
}

export async function deleteWishlistImageFromS3(imageUrl: string): Promise<void> {
  // Extract the key from the URL
  const match = imageUrl.match(/\/wishlist\/.*$/)
  if (!match) return
  const key = match[0].replace(/^\//, '')
  await s3.send(
    new DeleteObjectCommand({
      Bucket: BUCKET,
      Key: key,
    }),
  )
}
