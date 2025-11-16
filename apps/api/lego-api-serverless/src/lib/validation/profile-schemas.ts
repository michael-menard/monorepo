/**
 * Profile Validation Schemas
 *
 * Zod schemas for validating user profile operations including:
 * - Profile update requests (PATCH /api/users/:id)
 */

import { z } from 'zod'

/**
 * Update Profile Request Schema
 *
 * Validates the request body for PATCH /api/users/:id
 *
 * Constraints:
 * - name: Required, 1-100 characters, alphanumeric + spaces only
 *
 * Note: Only 'name' field is updatable via this API.
 * Other Cognito attributes (email, password) are managed via:
 * - Email changes: Cognito Hosted UI (requires verification)
 * - Password changes: Cognito forgot password flow
 * - Avatar: Dedicated upload/delete endpoints (Stories 4.4, 4.5)
 */
export const UpdateProfileSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name must be less than 100 characters')
    .regex(/^[a-zA-Z0-9\s]+$/, 'Name can only contain letters, numbers, and spaces'),
})

/**
 * Inferred TypeScript type for update profile request
 */
export type UpdateProfileRequest = z.infer<typeof UpdateProfileSchema>
