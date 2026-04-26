/**
 * Download images from BrickLink and upload to MinIO/S3.
 *
 * Key pattern: bricklink-mocs/{idModel}/images/{filename}
 */

import { basename, extname } from 'path'
import { initializeBucket, uploadToS3 } from '@repo/s3-client'
import { logger } from '@repo/logger'

const IMAGE_CONTENT_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
}

export async function initBucket(bucketName: string): Promise<void> {
  await initializeBucket(bucketName)
}

/**
 * Download an image from a URL and upload it to MinIO.
 * Returns the S3 key.
 */
export async function downloadAndUploadImage(
  imageUrl: string,
  idModel: number,
  fileName: string,
  bucketName: string,
): Promise<string> {
  // Normalize protocol-relative URLs
  const url = imageUrl.startsWith('//') ? `https:${imageUrl}` : imageUrl

  const response = await fetch(url, {
    signal: AbortSignal.timeout(30000),
  })

  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.status} ${response.statusText}`)
  }

  const buffer = Buffer.from(await response.arrayBuffer())
  const ext = extname(fileName).toLowerCase() || '.png'
  const contentType = IMAGE_CONTENT_TYPES[ext] || 'image/png'
  const key = `bricklink-mocs/${idModel}/images/${fileName}`

  await uploadToS3({
    key,
    body: buffer,
    contentType,
    bucket: bucketName,
  })

  return key
}

/**
 * Upload all gallery images for a design, returning S3 keys.
 */
export async function uploadDesignImages(
  imageUrls: string[],
  idModel: number,
  bucketName: string,
): Promise<{ mainImageS3Key: string | null; galleryImageS3Keys: string[] }> {
  const s3Keys: string[] = []
  let mainImageS3Key: string | null = null

  for (let i = 0; i < imageUrls.length; i++) {
    const url = imageUrls[i]
    // Derive filename from URL or use index
    const urlBasename = basename(new URL(url.startsWith('//') ? `https:${url}` : url).pathname)
    const ext = extname(urlBasename) || '.png'
    const fileName = `${String(i + 1).padStart(3, '0')}${ext}`

    try {
      const s3Key = await downloadAndUploadImage(url, idModel, fileName, bucketName)
      s3Keys.push(s3Key)

      if (i === 0) mainImageS3Key = s3Key

      logger.info(`[storage] Uploaded image ${i + 1}/${imageUrls.length}: ${fileName}`)
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      logger.warn(`[storage] Failed to upload image ${i + 1}: ${msg}`)
    }
  }

  return { mainImageS3Key, galleryImageS3Keys: s3Keys }
}
