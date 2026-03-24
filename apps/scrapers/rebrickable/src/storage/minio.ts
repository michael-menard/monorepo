import { readFile } from 'fs/promises'
import { extname } from 'path'
import { logger } from '@repo/logger'
import { initializeBucket, uploadToS3 } from '@repo/s3-client'

const CONTENT_TYPES: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.io': 'application/octet-stream',
  '.studio': 'application/octet-stream',
  '.ldr': 'text/plain',
  '.mpd': 'text/plain',
  '.lxf': 'application/octet-stream',
  '.zip': 'application/zip',
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
