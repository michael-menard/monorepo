import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

const BUCKET = process.env.S3_BUCKET!;
const REGION = process.env.S3_REGION!;
const s3 = new S3Client({ region: REGION });

export async function uploadAvatarToS3(userId: string, file: Express.Multer.File): Promise<string> {
  const ext = path.extname(file.originalname);
  const key = `avatars/${userId}/avatar-${uuidv4()}${ext}`;
  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: file.buffer,
    ContentType: file.mimetype,
    ACL: 'public-read',
  }));
  // Return the S3 URL (can be customized for CDN, etc.)
  return `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`;
}

export async function deleteAvatarFromS3(avatarUrl: string): Promise<void> {
  // Extract the key from the URL
  const match = avatarUrl.match(/\/avatars\/.*$/);
  if (!match) return;
  const key = match[0].replace(/^\//, '');
  await s3.send(new DeleteObjectCommand({
    Bucket: BUCKET,
    Key: key,
  }));
} 