import { DeleteObjectsCommand, S3Client } from '@aws-sdk/client-s3'
import { createLogger } from '@/core/observability/logger'

const logger = createLogger('set-images-s3')

export async function cleanupS3Images(
  images: { imageUrl: string; thumbnailUrl: string | null | undefined }[],
): Promise<void> {
  const bucket = process.env.SETS_BUCKET
  if (!bucket || images.length === 0) return

  const keys: string[] = []
  for (const img of images) {
    const mainKey = extractS3KeyFromUrl(img.imageUrl)
    if (mainKey) keys.push(mainKey)
    if (img.thumbnailUrl) {
      const thumbKey = extractS3KeyFromUrl(img.thumbnailUrl)
      if (thumbKey) keys.push(thumbKey)
    }
  }

  if (!keys.length) return

  const client = new S3Client({})

  await client.send(
    new DeleteObjectsCommand({
      Bucket: bucket,
      Delete: { Objects: keys.map(Key => ({ Key })) },
    }),
  )

  logger.info('Deleted S3 objects for set images', { count: keys.length })
}

function extractS3KeyFromUrl(url: string): string | null {
  try {
    const u = new URL(url)
    return u.pathname.startsWith('/') ? u.pathname.slice(1) : u.pathname
  } catch {
    return null
  }
}
