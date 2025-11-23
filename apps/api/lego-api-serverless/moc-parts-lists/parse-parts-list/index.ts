import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda'
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { db } from '@monorepo/db/client'
import { mocInstructions, mocPartsLists, mocParts } from '@/db/schema'
import { and, eq } from 'drizzle-orm'
import { getUserIdFromEvent } from '@monorepo/lambda-auth'
import { successResponse, errorResponse } from '@monorepo/lambda-responses'
import { createLogger } from '@/lib/utils/logger'
import { Readable } from 'stream'
import csv from 'csv-parser'
import { z } from 'zod'
import { nanoid } from 'nanoid'

const logger = createLogger('parse-parts-list')

// CSV Row interface matching story requirements
interface CSVRow {
  'Part ID': string
  'Part Name': string
  'Quantity': string
  'Color': string
}

// Validation schema for CSV rows
const PartRowSchema = z.object({
  'Part ID': z.string().min(1, 'Part ID is required'),
  'Part Name': z.string().min(1, 'Part Name is required'),
  'Quantity': z.string().regex(/^\d+$/, 'Quantity must be a positive integer'),
  'Color': z.string().min(1, 'Color is required'),
})

// Request body schema
const ParsePartsListRequestSchema = z.object({
  s3Key: z.string().min(1, 'S3 key is required'),
  mocId: z.string().uuid('Invalid MOC ID'),
})

/**
 * Parse CSV file from buffer
 */
async function parseCSV(csvBuffer: Buffer): Promise<CSVRow[]> {
  return new Promise((resolve, reject) => {
    const results: CSVRow[] = []
    const stream = Readable.from(csvBuffer.toString())

    stream
      .pipe(csv())
      .on('data', (row: CSVRow) => {
        // Validate row has required columns
        const validation = PartRowSchema.safeParse(row)

        if (!validation.success) {
          const errors = validation.error.issues.map(i => i.message).join(', ')
          reject(new Error(`Invalid CSV row: ${errors}`))
          return
        }

        // Additional validation: quantity must be positive
        const quantity = parseInt(row.Quantity, 10)
        if (quantity <= 0) {
          reject(new Error(`Quantity must be greater than 0, got: ${quantity}`))
          return
        }

        results.push(row)

        // Check max rows limit (10,000)
        if (results.length > 10000) {
          reject(new Error('CSV exceeds maximum 10,000 rows'))
          return
        }
      })
      .on('end', () => {
        if (results.length === 0) {
          reject(new Error('CSV file is empty or contains no valid data'))
          return
        }
        resolve(results)
      })
      .on('error', (error) => {
        reject(new Error(`CSV parsing error: ${error.message}`))
      })
  })
}

/**
 * Download file from S3
 */
async function downloadFromS3(bucket: string, key: string): Promise<Buffer> {
  const s3Client = new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
  })

  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  })

  const response = await s3Client.send(command)

  if (!response.Body) {
    throw new Error('S3 object has no body')
  }

  // Convert stream to buffer
  const chunks: Uint8Array[] = []
  for await (const chunk of response.Body as any) {
    chunks.push(chunk)
  }

  return Buffer.concat(chunks)
}

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  try {
    const userId = getUserIdFromEvent(event)
    if (!userId) {
      logger.warn('Unauthorized access attempt to parse parts list')
      return errorResponse(401, 'UNAUTHORIZED', 'Unauthorized')
    }

    if (!event.body) {
      logger.warn('Request missing body')
      return errorResponse(400, 'VALIDATION_ERROR', 'Request body is required')
    }

    // Parse and validate request body
    let requestData
    try {
      const parsedBody = JSON.parse(event.body)
      requestData = ParsePartsListRequestSchema.parse(parsedBody)
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ')
        logger.warn('Request validation failed', { errors })
        return errorResponse(400, 'VALIDATION_ERROR', `Invalid request: ${errors}`)
      }
      logger.warn('Invalid JSON in request body')
      return errorResponse(400, 'VALIDATION_ERROR', 'Invalid JSON in request body')
    }

    const { s3Key, mocId } = requestData
    logger.info('Processing CSV parts list', { userId, mocId, s3Key })

    // Verify MOC ownership
    const [moc] = await db
      .select()
      .from(mocInstructions)
      .where(and(eq(mocInstructions.id, mocId), eq(mocInstructions.userId, userId)))
      .limit(1)

    if (!moc) {
      logger.warn('MOC not found or unauthorized', { userId, mocId })
      return errorResponse(404, 'NOT_FOUND', 'MOC not found')
    }

    // Get S3 bucket from environment
    const bucket = process.env.BUCKET_NAME
    if (!bucket) {
      logger.error('BUCKET_NAME environment variable not set')
      return errorResponse(500, 'SERVER_ERROR', 'Server configuration error')
    }

    // Download CSV from S3
    let csvBuffer: Buffer
    try {
      csvBuffer = await downloadFromS3(bucket, s3Key)
      logger.info('Downloaded CSV from S3', { size: csvBuffer.length })
    } catch (error) {
      logger.error('Failed to download CSV from S3', error, { s3Key })
      return errorResponse(500, 'SERVER_ERROR', 'Failed to download CSV file from storage')
    }

    // Parse CSV
    let rows: CSVRow[]
    try {
      rows = await parseCSV(csvBuffer)
      logger.info('CSV parsed successfully', { rowCount: rows.length })
    } catch (error) {
      logger.error('CSV parsing failed', error)
      const message = error instanceof Error ? error.message : 'Failed to parse CSV'
      return errorResponse(400, 'VALIDATION_ERROR', message)
    }

    // Calculate total parts
    const totalParts = rows.reduce((sum, row) => sum + parseInt(row.Quantity, 10), 0)
    logger.info('Calculated total parts', { totalParts, rowCount: rows.length })

    // Store in database using transaction
    let partsListId: string
    try {
      await db.transaction(async (tx) => {
        // Create parts list record
        const [partsList] = await tx
          .insert(mocPartsLists)
          .values({
            id: nanoid(),
            mocId: mocId,
            title: 'Parts List',
            totalPartsCount: totalParts.toString(),
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .returning()

        partsListId = partsList.id

        // Insert individual parts in chunks of 1000
        const partRecords = rows.map(row => ({
          id: nanoid(),
          partsListId: partsList.id,
          partId: row['Part ID'],
          partName: row['Part Name'],
          quantity: parseInt(row.Quantity, 10),
          color: row.Color,
          createdAt: new Date(),
        }))

        // Insert in batches for performance
        for (let i = 0; i < partRecords.length; i += 1000) {
          const chunk = partRecords.slice(i, i + 1000)
          await tx.insert(mocParts).values(chunk)
          logger.debug('Inserted parts batch', { batchNumber: Math.floor(i / 1000) + 1, size: chunk.length })
        }

        // Update MOC partsCount (totalPieceCount)
        await tx
          .update(mocInstructions)
          .set({ partsCount: totalParts })
          .where(eq(mocInstructions.id, mocId))

        logger.info('Parts list created successfully', {
          userId,
          mocId,
          partsListId: partsList.id,
          totalParts,
          rowsProcessed: rows.length,
        })
      })
    } catch (error) {
      logger.error('Database transaction failed', error)
      return errorResponse(500, 'DATABASE_ERROR', 'Failed to save parts list')
    }

    return successResponse(200, {
      partsListId,
      totalParts,
      rowsProcessed: rows.length,
    })
  } catch (error) {
    logger.error('Unexpected error in parse-parts-list handler', error)
    return errorResponse(500, 'SERVER_ERROR', 'An unexpected error occurred')
  }
}
