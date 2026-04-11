import { Hono } from 'hono'
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { logger } from '@repo/logger'
import { auth } from '../../middleware/auth.js'
import { loadPermissions } from '../../middleware/load-permissions.js'
import { db, schema } from '../../composition/index.js'
import { createDashboardRepository } from './adapters.js'

const dashboardRepo = createDashboardRepository(db, schema)

// Presign client for thumbnail URLs
const s3Endpoint = process.env.S3_ENDPOINT
const presignClient = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  ...(s3Endpoint ? { endpoint: s3Endpoint, forcePathStyle: true } : {}),
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
})
const presignBucket = process.env.S3_BUCKET || process.env.AWS_S3_BUCKET || ''

async function presignS3Key(s3Key: string): Promise<string> {
  try {
    const command = new GetObjectCommand({ Bucket: presignBucket, Key: s3Key })
    return await getSignedUrl(presignClient, command, { expiresIn: 3600 })
  } catch {
    return ''
  }
}

const dashboard = new Hono()

dashboard.use('*', auth)
dashboard.use('*', loadPermissions)

/**
 * GET /dashboard/stats
 * Returns all dashboard data in a single call
 */
dashboard.get('/stats', async c => {
  const userId = c.get('userId')
  if (!userId) {
    return c.json({ error: 'UNAUTHORIZED' }, 401)
  }

  try {
    const [stats, themeBreakdown, recentMocsRaw, activityFeed] = await Promise.all([
      dashboardRepo.getStats(userId),
      dashboardRepo.getThemeBreakdown(userId),
      dashboardRepo.getRecentMocs(userId, 5),
      dashboardRepo.getActivityFeed(userId, 10),
    ])

    // Presign thumbnail URLs for recent MOCs
    const recentMocs = await Promise.all(
      recentMocsRaw.map(async moc => ({
        id: moc.id,
        title: moc.title,
        slug: moc.slug,
        thumbnail: moc.thumbnailS3Key ? await presignS3Key(moc.thumbnailS3Key) : null,
        theme: moc.theme ?? '',
        createdAt: moc.createdAt,
      })),
    )

    return c.json({
      stats: {
        totalMocs: stats.totalMocs,
        wishlistCount: stats.wishlistCount,
        themeCount: stats.themeCount,
        lastUpdated: stats.lastUpdated ?? new Date().toISOString(),
      },
      themeBreakdown,
      recentMocs,
      activityFeed,
    })
  } catch (error) {
    logger.error('Failed to fetch dashboard stats', error)
    return c.json({ error: 'INTERNAL_ERROR' }, 500)
  }
})

export default dashboard
