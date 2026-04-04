import { readFile } from 'fs/promises'
import { extname } from 'path'
import { logger } from '@repo/logger'
import { initializeBucket, uploadToS3, listObjectsFromS3 } from '@repo/s3-client'

const CONTENT_TYPES: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.io': 'application/octet-stream',
  '.studio': 'application/octet-stream',
  '.ldr': 'text/plain',
  '.mpd': 'text/plain',
  '.lxf': 'application/octet-stream',
  '.zip': 'application/zip',
}

const IMAGE_CONTENT_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
}

export async function initBucket(bucketName: string): Promise<void> {
  await initializeBucket(bucketName)
  logger.info(`[minio] Bucket "${bucketName}" ready`)
}

export async function uploadInstruction(
  filePath: string,
  mocNumber: string,
  fileName: string,
  bucketName: string,
): Promise<{ minioKey: string; minioUrl: string }> {
  const buffer = await readFile(filePath)
  const ext = extname(fileName).toLowerCase()
  const contentType = CONTENT_TYPES[ext] || 'application/octet-stream'
  const key = `mocs/MOC-${mocNumber}/${fileName}`

  const url = await uploadToS3({
    key,
    body: buffer,
    contentType,
    bucket: bucketName,
  })

  logger.info(`[minio] Uploaded ${fileName} → ${key}`)

  return { minioKey: key, minioUrl: url }
}

export async function uploadImage(
  filePath: string,
  mocNumber: string,
  fileName: string,
  bucketName: string,
): Promise<{ key: string; url: string }> {
  const buffer = await readFile(filePath)
  const ext = extname(fileName).toLowerCase()
  const contentType = IMAGE_CONTENT_TYPES[ext] || 'image/jpeg'
  const key = `mocs/MOC-${mocNumber}/images/${fileName}`

  const url = await uploadToS3({ key, body: buffer, contentType, bucket: bucketName })

  logger.info(`[minio] Uploaded image ${fileName} → ${key}`)

  return { key, url }
}

export async function listImages(mocNumber: string, bucketName: string): Promise<string[]> {
  return listObjectsFromS3({ bucket: bucketName, prefix: `mocs/MOC-${mocNumber}/images/` })
}
