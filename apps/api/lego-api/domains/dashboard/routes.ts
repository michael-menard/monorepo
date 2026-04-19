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
        ownedSetsCount: stats.ownedSetsCount,
        ownedMinifigsCount: stats.ownedMinifigsCount,
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

/**
 * DELETE /dashboard/tags/:tag
 * Remove a tag globally from all user's MOCs and from tag_theme_mappings
 */
dashboard.delete('/tags/:tag', async c => {
  const userId = c.get('userId')
  if (!userId) {
    return c.json({ error: 'UNAUTHORIZED' }, 401)
  }

  const tag = decodeURIComponent(c.req.param('tag'))
  if (!tag) {
    return c.json({ error: 'VALIDATION_ERROR', message: 'tag parameter required' }, 400)
  }

  try {
    const updatedCount = await dashboardRepo.deleteTagGlobally(userId, tag)
    return c.json({ ok: true, updatedCount })
  } catch (error) {
    logger.error('Failed to delete tag globally', error, { tag })
    return c.json({ error: 'INTERNAL_ERROR' }, 500)
  }
})

/**
 * GET /dashboard/tags
 * Returns all distinct tags from the user's MOCs with their theme mapping and MOC count
 */
dashboard.get('/tags', async c => {
  const userId = c.get('userId')
  if (!userId) {
    return c.json({ error: 'UNAUTHORIZED' }, 401)
  }

  try {
    const tags = await dashboardRepo.getUserTags(userId)
    return c.json({ tags })
  } catch (error) {
    logger.error('Failed to fetch user tags', error)
    return c.json({ error: 'INTERNAL_ERROR' }, 500)
  }
})

/**
 * GET /dashboard/themes
 * Returns all distinct theme names from tag_theme_mappings
 */
dashboard.get('/themes', async c => {
  const userId = c.get('userId')
  if (!userId) {
    return c.json({ error: 'UNAUTHORIZED' }, 401)
  }

  try {
    const themes = await dashboardRepo.getDistinctThemes()
    return c.json({ themes })
  } catch (error) {
    logger.error('Failed to fetch distinct themes', error)
    return c.json({ error: 'INTERNAL_ERROR' }, 500)
  }
})

/**
 * POST /dashboard/themes
 * Create a new theme bucket
 * Body: { name: string }
 */
dashboard.post('/themes', async c => {
  const userId = c.get('userId')
  if (!userId) {
    return c.json({ error: 'UNAUTHORIZED' }, 401)
  }

  try {
    const body = await c.req.json()
    const name = body?.name?.trim()
    if (typeof name !== 'string' || !name) {
      return c.json({ error: 'VALIDATION_ERROR', message: 'name is required' }, 400)
    }

    await dashboardRepo.createTheme(name)
    return c.json({ ok: true, name }, 201)
  } catch (error) {
    logger.error('Failed to create theme', error)
    return c.json({ error: 'INTERNAL_ERROR' }, 500)
  }
})

/**
 * DELETE /dashboard/themes/:name
 * Delete a theme and its tag mappings
 */
dashboard.delete('/themes/:name', async c => {
  const userId = c.get('userId')
  if (!userId) {
    return c.json({ error: 'UNAUTHORIZED' }, 401)
  }

  const name = decodeURIComponent(c.req.param('name'))
  if (!name) {
    return c.json({ error: 'VALIDATION_ERROR', message: 'name parameter required' }, 400)
  }

  try {
    await dashboardRepo.deleteTheme(name)
    return c.json({ ok: true })
  } catch (error) {
    logger.error('Failed to delete theme', error, { name })
    return c.json({ error: 'INTERNAL_ERROR' }, 500)
  }
})

/**
 * POST /dashboard/tag-themes
 * Add tag-to-theme mappings (many-to-many, idempotent)
 * Body: { mappings: [{ tag: string, theme: string }] }
 */
dashboard.post('/tag-themes', async c => {
  const userId = c.get('userId')
  if (!userId) {
    return c.json({ error: 'UNAUTHORIZED' }, 401)
  }

  try {
    const body = await c.req.json()
    const mappings = body?.mappings
    if (!Array.isArray(mappings) || mappings.length === 0) {
      return c.json({ error: 'VALIDATION_ERROR', message: 'mappings array required' }, 400)
    }

    for (const m of mappings) {
      if (typeof m.tag !== 'string' || typeof m.theme !== 'string' || !m.tag || !m.theme) {
        return c.json(
          { error: 'VALIDATION_ERROR', message: 'Each mapping must have non-empty tag and theme' },
          400,
        )
      }
    }

    await dashboardRepo.addTagThemeMappings(mappings)
    return c.json({ ok: true, count: mappings.length })
  } catch (error) {
    logger.error('Failed to add tag-theme mappings', error)
    return c.json({ error: 'INTERNAL_ERROR' }, 500)
  }
})

/**
 * DELETE /dashboard/tag-themes/:tag/:theme
 * Remove a specific tag-to-theme mapping
 */
dashboard.delete('/tag-themes/:tag/:theme', async c => {
  const userId = c.get('userId')
  if (!userId) {
    return c.json({ error: 'UNAUTHORIZED' }, 401)
  }

  const tag = decodeURIComponent(c.req.param('tag'))
  const theme = decodeURIComponent(c.req.param('theme'))
  if (!tag || !theme) {
    return c.json({ error: 'VALIDATION_ERROR', message: 'tag and theme parameters required' }, 400)
  }

  try {
    await dashboardRepo.removeTagThemeMapping(tag, theme)
    return c.json({ ok: true })
  } catch (error) {
    logger.error('Failed to remove tag-theme mapping', error, { tag, theme })
    return c.json({ error: 'INTERNAL_ERROR' }, 500)
  }
})

export default dashboard
