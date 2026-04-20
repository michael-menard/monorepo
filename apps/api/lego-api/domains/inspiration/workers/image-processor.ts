import { Worker, Queue } from 'bullmq'
import sharp from 'sharp'
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'
import { createHash } from 'crypto'
import { logger } from '@repo/logger'

const THUMBNAIL_WIDTH = 400
const PREVIEW_WIDTH = 1200

export interface ImageProcessingJob {
  imageId: string
  inspirationId: string
  minioKey: string
  originalFilename: string | null
}

export interface ImageProcessingResult {
  imageId: string
  thumbnailUrl: string | null
  thumbnailKey: string | null
  previewUrl: string | null
  previewKey: string | null
  fileHash: string
  width: number
  height: number
}

const redisConnection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
}

const QUEUE_NAME = 'inspiration-image-processing'

/**
 * Create the image processing queue
 */
export function createImageProcessingQueue() {
  return new Queue<ImageProcessingJob>(QUEUE_NAME, {
    connection: redisConnection,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      removeOnComplete: 100,
      removeOnFail: 50,
    },
  })
}

/**
 * Create the image processing worker
 *
 * Processes uploaded images: generates thumbnails, previews, computes hashes.
 * Updates the inspiration_images record via the provided callback.
 */
export function createImageProcessingWorker(
  onComplete: (result: ImageProcessingResult) => Promise<void>,
) {
  const minioEndpoint = process.env.MINIO_ENDPOINT || 'http://localhost:9000'
  const minioAccessKey = process.env.MINIO_ACCESS_KEY || 'minioadmin'
  const minioSecretKey = process.env.MINIO_SECRET_KEY || 'minioadmin'
  const bucket =
    process.env.S3_INSPIRATION_BUCKET || process.env.S3_BUCKET || 'lego-moc-inspirations'

  const s3Client = new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    endpoint: minioEndpoint,
    credentials: {
      accessKeyId: minioAccessKey,
      secretAccessKey: minioSecretKey,
    },
    forcePathStyle: true,
  })

  const worker = new Worker<ImageProcessingJob, ImageProcessingResult>(
    QUEUE_NAME,
    async job => {
      const { imageId, minioKey } = job.data

      logger.info('Processing image', { imageId, minioKey, attempt: job.attemptsMade + 1 })

      // Download original from MinIO
      const getCommand = new GetObjectCommand({ Bucket: bucket, Key: minioKey })
      const response = await s3Client.send(getCommand)

      if (!response.Body) {
        throw new Error(`Empty body for key: ${minioKey}`)
      }

      const originalBuffer = Buffer.from(await response.Body.transformToByteArray())

      // Compute file hash
      const fileHash = createHash('sha256').update(originalBuffer).digest('hex')

      // Get image metadata
      const metadata = await sharp(originalBuffer).metadata()
      const width = metadata.width || 0
      const height = metadata.height || 0

      // Generate thumbnail (~400px wide, WebP)
      const thumbBuffer = await sharp(originalBuffer)
        .resize(THUMBNAIL_WIDTH, null, { withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer()

      const thumbKey = minioKey.replace(/\.[^.]+$/, '-thumb.webp')
      await s3Client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: thumbKey,
          Body: thumbBuffer,
          ContentType: 'image/webp',
        }),
      )
      const thumbnailUrl = `${minioEndpoint}/${bucket}/${thumbKey}`

      // Generate preview (~1200px wide, WebP) only if original is larger
      let previewUrl: string | null = null
      let previewKey: string | null = null
      if (width > PREVIEW_WIDTH) {
        const previewBuffer = await sharp(originalBuffer)
          .resize(PREVIEW_WIDTH, null, { withoutEnlargement: true })
          .webp({ quality: 85 })
          .toBuffer()

        previewKey = minioKey.replace(/\.[^.]+$/, '-preview.webp')
        await s3Client.send(
          new PutObjectCommand({
            Bucket: bucket,
            Key: previewKey,
            Body: previewBuffer,
            ContentType: 'image/webp',
          }),
        )
        previewUrl = `${minioEndpoint}/${bucket}/${previewKey}`
      }

      const result: ImageProcessingResult = {
        imageId,
        thumbnailUrl,
        thumbnailKey: thumbKey,
        previewUrl,
        previewKey,
        fileHash,
        width,
        height,
      }

      logger.info('Image processed successfully', {
        imageId,
        thumbnailKey: thumbKey,
        previewKey,
        fileHash: fileHash.substring(0, 12) + '...',
        dimensions: `${width}x${height}`,
      })

      return result
    },
    {
      connection: redisConnection,
      concurrency: 3,
    },
  )

  worker.on('completed', async job => {
    if (job.returnvalue) {
      try {
        await onComplete(job.returnvalue)
      } catch (error) {
        logger.error('Failed to update image after processing', {
          imageId: job.returnvalue.imageId,
          error,
        })
      }
    }
  })

  worker.on('failed', (job, error) => {
    logger.error('Image processing failed', {
      imageId: job?.data.imageId,
      minioKey: job?.data.minioKey,
      attempt: job?.attemptsMade,
      error: error.message,
    })
  })

  return worker
}
