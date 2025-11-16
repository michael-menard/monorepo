/**
 * TypeScript Types for User Profile Operations
 *
 * Defines types for Cognito user attributes and API responses for profile endpoints.
 */

/**
 * Cognito User Profile
 *
 * Represents the core user attributes stored in AWS Cognito User Pool.
 * These attributes come from Cognito's AdminGetUser API response.
 */
export interface CognitoUserProfile {
  /** Cognito sub claim - unique user identifier */
  sub: string

  /** User's email address */
  email: string

  /** Email verification status */
  email_verified: boolean

  /** User's display name (optional) */
  name?: string

  /** Avatar/profile picture URL (optional) */
  picture?: string

  /** Cognito username (may differ from email) */
  'cognito:username'?: string
}

/**
 * User Profile Response
 *
 * API response format for GET /api/users/{id}
 * Combines Cognito user data with PostgreSQL statistics
 */
export interface UserProfileResponse {
  /** User ID (Cognito sub) */
  id: string

  /** User's email address */
  email: string

  /** User's display name */
  name: string | null

  /** Avatar URL (S3 path) */
  avatarUrl: string | null

  /** User's content statistics from PostgreSQL */
  stats: {
    /** Total number of MOC instructions */
    mocs: number

    /** Total number of gallery images */
    images: number

    /** Total number of wishlist items */
    wishlistItems: number
  }
}

/**
 * Update Profile Request
 *
 * Request body for PATCH /api/users/{id}
 * Only name is updatable (email changes handled by Cognito flows)
 */
export interface UpdateProfileRequest {
  /** User's display name */
  name?: string
}

/**
 * Avatar Upload Response
 *
 * Response for POST /api/users/{id}/avatar
 */
export interface AvatarUploadResponse {
  /** S3 URL of uploaded avatar */
  avatarUrl: string

  /** Upload timestamp */
  uploadedAt: string
}
