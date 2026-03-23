import { uploadToS3, initializeBucket, getS3Client } from '@repo/s3-client'
import { GetObjectCommand } from '@aws-sdk/client-s3'
import { logger } from '@repo/logger'
import type { Attachment } from './types.js'

let bucketInitialized = false

function getBucket(): string {
  return process.env.AWS_S3_BUCKET || 'lego-uploads-dev'
}

async function ensureBucket(): Promise<void> {
  if (bucketInitialized) return
  await initializeBucket(getBucket())
  bucketInitialized = true
}

export async function uploadAttachment(
  conversationId: string,
  messageId: string,
  file: { buffer: Buffer; filename: string; contentType: string; size: number },
): Promise<Attachment> {
  await ensureBucket()

  const id = crypto.randomUUID()
  const key = `chat-attachments/${conversationId}/${messageId}/${id}-${file.filename}`

  await uploadToS3({
    key,
    body: file.buffer,
    contentType: file.contentType,
    bucket: getBucket(),
  })

  logger.info(`Uploaded chat attachment: ${key} (${file.size} bytes)`)

  return {
    id,
    filename: file.filename,
    contentType: file.contentType,
    size: file.size,
    url: key,
  }
}

export async function getAttachmentStream(key: string) {
  await ensureBucket()

  const s3 = getS3Client()
  const response = await s3.send(
    new GetObjectCommand({
      Bucket: getBucket(),
      Key: key,
    }),
  )

  return {
    body: response.Body,
    contentType: response.ContentType || 'application/octet-stream',
    contentLength: response.ContentLength,
  }
}
