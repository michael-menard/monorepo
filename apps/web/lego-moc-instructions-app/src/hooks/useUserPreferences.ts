import { useState, useEffect, useCallback } from 'react'
import { z } from 'zod'

// Zod schema for user preferences
const UserPreferencesSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']).default('system'),
  language: z.string().default('en'),
  notifications: z
    .object({
      email: z.boolean().default(true),
      push: z.boolean().default(true),
      marketing: z.boolean().default(false),
    })
    .default({}),
  privacy: z
    .object({
      analytics: z.boolean().default(true),
      cookies: z.boolean().default(true),
    })
    .default({}),
  accessibility: z
    .object({
      reducedMotion: z.boolean().default(false),
      highContrast: z.boolean().default(false),
      fontSize: z.enum(['small', 'medium', 'large']).default('medium'),
    })
    .default({}),
})

export type UserPreferences = z.infer<typeof UserPreferencesSchema>

// Export the schema as well for validation in other modules
export { UserPreferencesSchema }

const STORAGE_KEY = 'user-preferences'

// Default preferences
const defaultPreferences: UserPreferences = {
  theme: 'system',
  language: 'en',
  notifications: {
    email: true,
    push: true,
    marketing: false,
  },
  privacy: {
    analytics: true,
    cookies: true,
  },
  accessibility: {
    reducedMotion: false,
    highContrast: false,
    fontSize: 'medium',
  },
}

/**
 * Hook for managing user preferences with localStorage persistence
 * Includes validation, error handling, and type safety
 */
export const useUserPreferences = () => {
  const [preferences, setPreferences] = useState<UserPreferences>(defaultPreferences)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load preferences from localStorage on mount
  useEffect(() => {
    const loadPreferences = () => {
      try {
        setIsLoading(true)
        setError(null)

        const stored = localStorage.getItem(STORAGE_KEY)
        if (stored) {
          const parsed = JSON.parse(stored)
          // Validate and merge with defaults
          const validated = UserPreferencesSchema.parse({
            ...defaultPreferences,
            ...parsed,
            // Ensure nested objects are properly merged
            notifications: {
              ...defaultPreferences.notifications,
              ...parsed.notifications,
            },
            privacy: {
              ...defaultPreferences.privacy,
              ...parsed.privacy,
            },
            accessibility: {
              ...defaultPreferences.accessibility,
              ...parsed.accessibility,
            },
          })
          setPreferences(validated)
        } else {
          // First time user - save defaults
          localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultPreferences))
          setPreferences(defaultPreferences)
        }
      } catch (err) {
        setError('Failed to load preferences')
        // Fall back to defaults
        setPreferences(defaultPreferences)
        // Try to save defaults
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultPreferences))
        } catch (saveErr) {}
      } finally {
        setIsLoading(false)
      }
    }

    loadPreferences()
  }, [])

  // Save preferences to localStorage
  const savePreferences = useCallback((newPreferences: UserPreferences) => {
    try {
      setError(null)
      // Validate before saving
      const validated = UserPreferencesSchema.parse(newPreferences)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(validated))
      setPreferences(validated)
      return true
    } catch (err) {
      setError('Failed to save preferences')
      return false
    }
  }, [])

  // Update specific preference
  const updatePreference = useCallback(
    <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => {
      const newPreferences = { ...preferences, [key]: value }
      return savePreferences(newPreferences)
    },
    [preferences, savePreferences],
  )

  // Update nested preference
  const updateNestedPreference = useCallback(
    <K extends keyof UserPreferences, NK extends keyof UserPreferences[K]>(
      key: K,
      nestedKey: NK,
      value: UserPreferences[K][NK],
    ) => {
      const newPreferences = {
        ...preferences,
        [key]: {
          ...preferences[key],
          [nestedKey]: value,
        },
      }
      return savePreferences(newPreferences)
    },
    [preferences, savePreferences],
  )

  // Reset to defaults
  const resetPreferences = useCallback(() => {
    return savePreferences(defaultPreferences)
  }, [savePreferences])

  // Export preferences (for backup/sync)
  const exportPreferences = useCallback(() => {
    return JSON.stringify(preferences, null, 2)
  }, [preferences])

  // Import preferences (from backup/sync)
  const importPreferences = useCallback(
    (preferencesJson: string) => {
      try {
        const parsed = JSON.parse(preferencesJson)
        const validated = UserPreferencesSchema.parse(parsed)
        return savePreferences(validated)
      } catch (err) {
        setError('Invalid preferences format')
        return false
      }
    },
    [savePreferences],
  )

  return {
    preferences,
    isLoading,
    error,
    updatePreference,
    updateNestedPreference,
    savePreferences,
    resetPreferences,
    exportPreferences,
    importPreferences,
  }
}
