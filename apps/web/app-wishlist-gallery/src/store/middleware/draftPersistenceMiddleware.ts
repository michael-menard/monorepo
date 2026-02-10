/**
 * Draft Persistence Middleware
 *
 * Custom RTK middleware for persisting wishlist draft state to localStorage.
 * Implements:
 * - 500ms debounced writes to prevent excessive localStorage writes
 * - User-scoped keys for multi-user devices
 * - Error handling for quota exceeded and invalid JSON
 * - Rehydration on store initialization
 *
 * Story WISH-2015: Form Autosave via RTK Slice with localStorage Persistence
 */

import { Middleware } from '@reduxjs/toolkit'
import { logger } from '@repo/logger'
import { DraftStateSchema, type DraftFormData, clearDraft } from '../slices/wishlistDraftSlice'
// import type { RootState } from '../index'

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const DEBOUNCE_MS = 500
const DRAFT_EXPIRY_DAYS = 7

/**
 * localStorage key format: wishlist:draft:{userId}:add-item
 */
const getDraftKey = (userId: string): string => `wishlist:draft:${userId}:add-item`

// ─────────────────────────────────────────────────────────────────────────────
// Persistence Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Save draft to localStorage with error handling
 */
function saveDraftToLocalStorage(userId: string, formData: DraftFormData, timestamp: number): void {
  try {
    const key = getDraftKey(userId)
    const data = { formData, timestamp }
    localStorage.setItem(key, JSON.stringify(data))
  } catch (error) {
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      logger.warn('localStorage quota exceeded, draft not saved')
    } else {
      logger.error('Failed to save draft to localStorage', { error })
    }
  }
}

/**
 * Remove draft from localStorage
 */
function removeDraftFromLocalStorage(userId: string): void {
  try {
    const key = getDraftKey(userId)
    localStorage.removeItem(key)
  } catch (error) {
    logger.error('Failed to remove draft from localStorage', { error })
  }
}

/**
 * Load draft from localStorage with validation
 * Returns null if draft is invalid, expired, or doesn't exist
 */
export function loadDraftFromLocalStorage(
  userId: string | null,
): {
  formData: DraftFormData
  timestamp: number
} | null {
  if (!userId) {
    return null
  }

  try {
    const key = getDraftKey(userId)
    const raw = localStorage.getItem(key)

    if (!raw) {
      return null
    }

    // Parse and validate JSON
    const parsed = JSON.parse(raw)
    const validated = DraftStateSchema.omit({ isRestored: true }).parse(parsed)

    // Check if draft is expired (> 7 days old)
    if (validated.timestamp) {
      const ageInDays = (Date.now() - validated.timestamp) / (1000 * 60 * 60 * 24)
      if (ageInDays > DRAFT_EXPIRY_DAYS) {
        logger.info('Draft expired, clearing from localStorage', { ageInDays })
        localStorage.removeItem(key)
        return null
      }
    }

    return validated.timestamp
      ? { formData: validated.formData, timestamp: validated.timestamp }
      : null
  } catch (error) {
    logger.warn('Failed to load draft from localStorage, clearing corrupted data', { error })
    // Clear corrupted data
    try {
      const key = getDraftKey(userId)
      localStorage.removeItem(key)
    } catch {}
    return null
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Middleware
// ─────────────────────────────────────────────────────────────────────────────

let debounceTimer: NodeJS.Timeout | null = null

/**
 * Draft persistence middleware
 * Listens for wishlistDraft/* actions and persists to localStorage
 */
export const draftPersistenceMiddleware: Middleware =
  store => next => action => {
    // Pass action through first
    const result = next(action)

    // Only process actions with a type property
    if (!action || typeof action !== 'object' || !('type' in action)) {
      return result
    }

    const actionType = (action as { type: string }).type

    // Only process wishlistDraft actions
    if (typeof actionType !== 'string' || !actionType.startsWith('wishlistDraft/')) {
      return result
    }

    // Get current state after action
    const state = store.getState() as any
    const userId = state.auth?.user?.id

    // Skip if user is not authenticated
    if (!userId) {
      return result
    }

    // Handle clearDraft action immediately (no debounce)
    if (actionType === clearDraft.type) {
      if (debounceTimer) {
        clearTimeout(debounceTimer)
        debounceTimer = null
      }
      removeDraftFromLocalStorage(userId)
      return result
    }

    // Debounce all other draft actions
    if (debounceTimer) {
      clearTimeout(debounceTimer)
    }

    debounceTimer = setTimeout(() => {
      const currentState = store.getState() as any
      const currentUserId = currentState.auth?.user?.id

      if (currentUserId && currentState.wishlistDraft) {
        const { formData, timestamp } = currentState.wishlistDraft
        if (timestamp) {
          saveDraftToLocalStorage(currentUserId, formData, timestamp)
        }
      }

      debounceTimer = null
    }, DEBOUNCE_MS)

    return result
  }
