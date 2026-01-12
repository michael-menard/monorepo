import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda'
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { eq } from 'drizzle-orm'

import { getUserIdFromEvent } from '@repo/lambda-auth'
import {
  errorResponse,
  errorResponseFromError,
  ValidationError,
  NotFoundError,
  ForbiddenError,
} from '@/core/utils/responses'
import { createLogger } from '@/core/observability/logger'
import { getDbAsync } from '@/core/database/client'
import { mocInstructions } from '@/core/database/schema'
import { PresignImageSchema } from '@/endpoints/sets/schemas'

const logger = createLogger('sets-images-presign')

export async function handler(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  const requestId = event.requestContext.requestId ?? 'unknown'

  try {
    const userId = getUserIdFromEvent(event)
    if (!userId) {
      return errorResponse(401, 'UNAUTHORIZED', 'Authentication required', { requestId })
    }

    const setId = event.pathParameters?.id
    if (!setId) {
      throw new ValidationError('Set ID is required')
    }

    let body: unknown
    try {
      body = JSON.parse(event.body || '{}')
    } catch {
      throw new ValidationError('Invalid JSON body')
    }

    const parsed = PresignImageSchema.safeParse(body)
    if (!parsed.success) {
      throw new ValidationError('Invalid request body', {
        errors: parsed.error.flatten(),
      })
    }

    const { filename, contentType } = parsed.data

    const db = await getDbAsync()
    const [row] = await db
      .select({ userId: mocInstructions.userId, type: mocInstructions.type })
      .from(mocInstructions)
      .where(eq(mocInstructions.id, setId))
      .limit(1)

    if (!row) {
      throw new NotFoundError('Set not found')
    }
    if (row.userId !== userId || row.type !== 'set') {
      throw new ForbiddenError('Not authorized to upload images for this set')
    }

    const bucket = process.env.SETS_BUCKET
    if (!bucket) {
      throw new Error('SETS_BUCKET env var is not configured')
    }

    const stage = process.env.STAGE ?? 'dev'
    const sanitizedFilename = filename.replace(/[^\w.\-]/g, '_')
    const ext = sanitizedFilename.includes('.') ? sanitizedFilename.split('.').pop()! : ''
    const unique = crypto.randomUUID()
    const key = `${stage}/sets/${userId}/${setId}/${unique}${ext ? `.${ext}` : ''}`

    const client = new S3Client({})
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType,
      ServerSideEncryption: 'AES256',
    })

    const expiresIn = 300
    const uploadUrl = await getSignedUrl(client, command, { expiresIn })
    const imageUrl = `https://${bucket}.s3.amazonaws.com/${key}`

    logger.info('Generated set image presign', {
      requestId,
      userId,
      setId,
      key,
    })

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': 'true',
      },
      body: JSON.stringify({
        uploadUrl,
        imageUrl,
        key,
        expiresIn,
      }),
    }
  } catch (error) {
    logger.error('Set image presign error', { requestId, error })
    return errorResponseFromError(error, requestId)
  }
}
