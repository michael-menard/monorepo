import { z } from 'zod'

// User profile schema
export const profileSchema = z.object({
  id: z.string().uuid(),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  username: z.string().min(3, 'Username must be at least 3 characters').optional(),
  bio: z.string().max(500, 'Bio must be less than 500 characters').optional(),
  avatar: z.string().url().optional(),
  avatarFile: z.instanceof(File).optional(),
  phone: z.string().optional(),
  dateOfBirth: z.date().optional(),
  location: z.string().optional(),
  website: z.string().url().optional(),
  socialLinks: z
    .object({
      twitter: z.string().url().optional(),
      linkedin: z.string().url().optional(),
      github: z.string().url().optional(),
      instagram: z.string().url().optional(),
    })
    .optional(),
  preferences: z
    .object({
      emailNotifications: z.boolean().default(true),
      pushNotifications: z.boolean().default(true),
      publicProfile: z.boolean().default(false),
      theme: z.enum(['light', 'dark', 'system']).default('system'),
    })
    .optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

// Create profile schema (for new profiles)
export const createProfileSchema = profileSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
})

// Update profile schema (for editing existing profiles)
export const updateProfileSchema = createProfileSchema.partial()

// Avatar upload schema
export const avatarUploadSchema = z.object({
  file: z
    .instanceof(File)
    .refine(
      file => file.size <= 5 * 1024 * 1024, // 5MB max
      'File size must be less than 5MB',
    )
    .refine(
      file => ['image/jpeg', 'image/png', 'image/webp'].includes(file.type),
      'File must be a valid image (JPEG, PNG, or WebP)',
    ),
})

// Profile form schema (for form validation)
export const profileFormSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  username: z.string().min(3, 'Username must be at least 3 characters').optional(),
  bio: z.string().max(500, 'Bio must be less than 500 characters').optional(),
  phone: z.string().optional(),
  dateOfBirth: z.date().optional(),
  location: z.string().optional(),
  website: z.string().url().optional(),
  socialLinks: z
    .object({
      twitter: z.string().url().optional(),
      linkedin: z.string().url().optional(),
      github: z.string().url().optional(),
      instagram: z.string().url().optional(),
    })
    .optional(),
  preferences: z
    .object({
      emailNotifications: z.boolean().default(true),
      pushNotifications: z.boolean().default(true),
      publicProfile: z.boolean().default(false),
      theme: z.enum(['light', 'dark', 'system']).default('system'),
    })
    .optional(),
})

// Password change schema
export const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine(data => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  })

// Email change schema
export const emailChangeSchema = z.object({
  currentEmail: z.string().email('Invalid current email'),
  newEmail: z.string().email('Invalid new email'),
  password: z.string().min(1, 'Password is required'),
})

// Delete account schema
export const deleteAccountSchema = z
  .object({
    password: z.string().min(1, 'Password is required'),
    confirmation: z.string().min(1, 'Please type "DELETE" to confirm'),
  })
  .refine(data => data.confirmation === 'DELETE', {
    message: 'Please type "DELETE" to confirm account deletion',
    path: ['confirmation'],
  })

// Export types
export type Profile = z.infer<typeof profileSchema>
export type CreateProfile = z.infer<typeof createProfileSchema>
export type UpdateProfile = z.infer<typeof updateProfileSchema>
export type AvatarUpload = z.infer<typeof avatarUploadSchema>
export type ProfileForm = z.infer<typeof profileFormSchema>
export type PasswordChange = z.infer<typeof passwordChangeSchema>
export type EmailChange = z.infer<typeof emailChangeSchema>
export type DeleteAccount = z.infer<typeof deleteAccountSchema>
