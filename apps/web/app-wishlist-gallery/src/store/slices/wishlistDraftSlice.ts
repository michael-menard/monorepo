/**
 * Wishlist Draft Slice
 *
 * RTK slice for managing form draft state with localStorage persistence.
 * Autosaves form input during add item flow to prevent data loss.
 *
 * Story WISH-2015: Form Autosave via RTK Slice with localStorage Persistence
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { z } from 'zod'

// ─────────────────────────────────────────────────────────────────────────────
// Zod Schemas (REQUIRED per CLAUDE.md - no TypeScript interfaces)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Draft form data schema matching WishlistForm field structure
 */
export const DraftFormDataSchema = z.object({
  title: z.string().default(''),
  store: z.string().default(''),
  setNumber: z.string().optional(),
  sourceUrl: z.string().optional(),
  imageUrl: z.string().optional(),
  price: z.string().optional(),
  pieceCount: z.number().int().nonnegative().optional(),
  releaseDate: z.string().optional(),
  tags: z.array(z.string()).default([]),
  priority: z.number().int().min(0).max(5).default(0),
  notes: z.string().optional(),
})

export type DraftFormData = z.infer<typeof DraftFormDataSchema>

/**
 * Complete draft state schema including metadata
 */
export const DraftStateSchema = z.object({
  formData: DraftFormDataSchema,
  timestamp: z.number().nullable(),
  isRestored: z.boolean(),
})

export type DraftState = z.infer<typeof DraftStateSchema>

/**
 * Single field update payload schema
 */
export const UpdateFieldPayloadSchema = z.object({
  field: z.string(),
  value: z.unknown(),
})

export type UpdateFieldPayload = z.infer<typeof UpdateFieldPayloadSchema>

// ─────────────────────────────────────────────────────────────────────────────
// Initial State
// ─────────────────────────────────────────────────────────────────────────────

const initialState: DraftState = {
  formData: {
    title: '',
    store: '',
    setNumber: undefined,
    sourceUrl: undefined,
    imageUrl: undefined,
    price: undefined,
    pieceCount: undefined,
    releaseDate: undefined,
    tags: [],
    priority: 0,
    notes: undefined,
  },
  timestamp: null,
  isRestored: false,
}

// ─────────────────────────────────────────────────────────────────────────────
// Slice Definition
// ─────────────────────────────────────────────────────────────────────────────

export const wishlistDraftSlice = createSlice({
  name: 'wishlistDraft',
  initialState,
  reducers: {
    /**
     * Update a single form field
     * Triggered on every field change to enable autosave
     */
    updateDraftField: (
      state,
      action: PayloadAction<{ field: keyof DraftFormData; value: any }>,
    ) => {
      const { field, value } = action.payload
      // @ts-expect-error - Dynamic field assignment
      state.formData[field] = value
      state.timestamp = Date.now()
    },

    /**
     * Bulk set all form fields
     * Used for rehydration from localStorage
     */
    setDraft: (state, action: PayloadAction<DraftFormData>) => {
      state.formData = action.payload
      state.timestamp = Date.now()
    },

    /**
     * Clear draft state
     * Called on form submission or "Start fresh" action
     */
    clearDraft: state => {
      state.formData = initialState.formData
      state.timestamp = null
      state.isRestored = false
    },

    /**
     * Set draft restored flag
     * Used to control "Resume draft" banner visibility
     */
    setDraftRestored: (state, action: PayloadAction<boolean>) => {
      state.isRestored = action.payload
    },
  },
})

// ─────────────────────────────────────────────────────────────────────────────
// Actions
// ─────────────────────────────────────────────────────────────────────────────

export const { updateDraftField, setDraft, clearDraft, setDraftRestored } =
  wishlistDraftSlice.actions

// ─────────────────────────────────────────────────────────────────────────────
// Selectors
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Select full draft state
 */
export const selectDraft = (state: { wishlistDraft: DraftState }) => state.wishlistDraft

/**
 * Select just the form data portion
 */
export const selectDraftFormData = (state: { wishlistDraft: DraftState }) =>
  state.wishlistDraft.formData

/**
 * Select whether draft was restored from localStorage
 */
export const selectIsDraftRestored = (state: { wishlistDraft: DraftState }) =>
  state.wishlistDraft.isRestored

/**
 * Select whether any draft data exists
 * Returns true if any field is non-empty
 */
export const selectHasDraft = (state: { wishlistDraft: DraftState }): boolean => {
  const { formData } = state.wishlistDraft
  return (
    Boolean(formData.title) ||
    Boolean(formData.store && formData.store !== 'LEGO') || // 'LEGO' is default
    Boolean(formData.setNumber) ||
    Boolean(formData.sourceUrl) ||
    Boolean(formData.imageUrl) ||
    Boolean(formData.price) ||
    Boolean(formData.pieceCount) ||
    Boolean(formData.releaseDate) ||
    Boolean(formData.tags.length > 0) ||
    Boolean(formData.priority && formData.priority > 0) ||
    Boolean(formData.notes)
  )
}
