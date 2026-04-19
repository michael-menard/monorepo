import { Hono } from 'hono'
import { auth } from '../../middleware/auth.js'
import { db, schema } from '../../composition/index.js'
import { createUserProfileService } from './application/index.js'
import {
  createUserProfileRepository,
  createActivityEventRepository,
  createAvatarStorage,
} from './adapters/index.js'
import {
  UpdateProfileInputSchema,
  UpdatePreferencesInputSchema,
  AvatarUploadInputSchema,
  ListActivityQuerySchema,
} from './types.js'

// Wire dependencies
const profileRepo = createUserProfileRepository(db, schema)
const activityRepo = createActivityEventRepository(db, schema)
const avatarStorage = createAvatarStorage()

const userProfileService = createUserProfileService({
  profileRepo,
  activityRepo,
  avatarStorage,
})

const userProfile = new Hono()

// All routes require authentication
userProfile.use('*', auth)

// GET /user/profile — get current user's profile
userProfile.get('/profile', async c => {
  const userId = c.get('userId')
  const result = await userProfileService.getProfile(userId)

  if (!result.ok) {
    return c.json({ error: result.error }, 500)
  }

  return c.json(result.data)
})

// PUT /user/profile — update current user's profile
userProfile.put('/profile', async c => {
  const userId = c.get('userId')
  const body = await c.req.json()
  const input = UpdateProfileInputSchema.safeParse(body)

  if (!input.success) {
    return c.json({ error: 'Validation failed', details: input.error.flatten() }, 400)
  }

  const result = await userProfileService.updateProfile(userId, input.data)

  if (!result.ok) {
    return c.json({ error: result.error }, 500)
  }

  return c.json(result.data)
})

// GET /user/preferences — get current user's preferences
userProfile.get('/preferences', async c => {
  const userId = c.get('userId')
  const result = await userProfileService.getPreferences(userId)

  if (!result.ok) {
    return c.json({ error: result.error }, 500)
  }

  return c.json(result.data)
})

// PUT /user/preferences — update current user's preferences
userProfile.put('/preferences', async c => {
  const userId = c.get('userId')
  const body = await c.req.json()
  const input = UpdatePreferencesInputSchema.safeParse(body)

  if (!input.success) {
    return c.json({ error: 'Validation failed', details: input.error.flatten() }, 400)
  }

  const result = await userProfileService.updatePreferences(userId, input.data.preferences)

  if (!result.ok) {
    return c.json({ error: result.error }, 500)
  }

  return c.json(result.data)
})

// POST /user/avatar/presign — get presigned URL for avatar upload
userProfile.post('/avatar/presign', async c => {
  const userId = c.get('userId')
  const body = await c.req.json()
  const input = AvatarUploadInputSchema.safeParse(body)

  if (!input.success) {
    return c.json({ error: 'Validation failed', details: input.error.flatten() }, 400)
  }

  const result = await userProfileService.presignAvatarUpload(
    userId,
    input.data.filename,
    input.data.contentType,
  )

  if (!result.ok) {
    return c.json({ error: result.error }, 500)
  }

  return c.json(result.data)
})

// GET /user/activity — get current user's activity feed
userProfile.get('/activity', async c => {
  const userId = c.get('userId')
  const query = ListActivityQuerySchema.safeParse(c.req.query())

  if (!query.success) {
    return c.json({ error: 'Validation failed', details: query.error.flatten() }, 400)
  }

  const { page, limit, type } = query.data
  const result = await userProfileService.listActivity(userId, { page, limit }, type)

  return c.json(result)
})

export default userProfile
