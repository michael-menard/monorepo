/**
 * Internal Types for Pipeline Queue Package
 *
 * Zod schemas for pipeline job data structures used by the autonomous pipeline (APIP).
 * This is the canonical source of truth for job payload schemas.
 *
 * F002: Aligned to supervisor discriminated union format.
 */

import { z } from 'zod'

/**
 * Pipeline phase enum — kept for backward compatibility with CLI graph-status command.
 */
const PipelinePhaseSchema = z.enum([
  'elaboration',
  'story-creation',
  'implementation',
  'review',
  'qa',
  'merge',
])

export type PipelinePhase = z.infer<typeof PipelinePhaseSchema>

// ─────────────────────────────────────────────────────────────────────────────
// Reusable story snapshot payload (used by implementation/review/qa jobs)
// ─────────────────────────────────────────────────────────────────────────────

export const StorySnapshotPayloadSchema = z
  .object({
    storyId: z.string().min(1),
    title: z.string().min(1),
    description: z.string().default(''),
    feature: z.string().default(''),
    state: z.string().default('ready'),
  })
  .passthrough()

export type StorySnapshotPayload = z.infer<typeof StorySnapshotPayloadSchema>

// ─────────────────────────────────────────────────────────────────────────────
// Elaboration job — stage:'elaboration'
// ─────────────────────────────────────────────────────────────────────────────

export const ElaborationJobDataSchema = z.object({
  storyId: z.string().min(1),
  stage: z.literal('elaboration'),
  attemptNumber: z.number().int().min(1),
  payload: z.record(z.unknown()),
  priority: z.number().int().optional(),
  touchedPathPrefixes: z.array(z.string()).default([]),
})

export type ElaborationJobData = z.infer<typeof ElaborationJobDataSchema>

// ─────────────────────────────────────────────────────────────────────────────
// Story-creation job — stage:'story-creation'
// ─────────────────────────────────────────────────────────────────────────────

export const StoryCreationJobDataSchema = z.object({
  storyId: z.string().min(1),
  stage: z.literal('story-creation'),
  attemptNumber: z.number().int().min(1),
  payload: z.record(z.unknown()),
  priority: z.number().int().optional(),
  touchedPathPrefixes: z.array(z.string()).default([]),
})

export type StoryCreationJobData = z.infer<typeof StoryCreationJobDataSchema>

// ─────────────────────────────────────────────────────────────────────────────
// Implementation job — stage:'implementation'
// ─────────────────────────────────────────────────────────────────────────────

export const ImplementationJobDataSchema = z.object({
  storyId: z.string().min(1),
  stage: z.literal('implementation'),
  attemptNumber: z.number().int().min(1),
  payload: StorySnapshotPayloadSchema,
  priority: z.number().int().optional(),
  touchedPathPrefixes: z.array(z.string()).default([]),
})

export type ImplementationJobData = z.infer<typeof ImplementationJobDataSchema>

// ─────────────────────────────────────────────────────────────────────────────
// Review job — stage:'review'
// ─────────────────────────────────────────────────────────────────────────────

export const ReviewJobDataSchema = z.object({
  storyId: z.string().min(1),
  stage: z.literal('review'),
  attemptNumber: z.number().int().min(1),
  payload: StorySnapshotPayloadSchema,
  priority: z.number().int().optional(),
  touchedPathPrefixes: z.array(z.string()).default([]),
})

export type ReviewJobData = z.infer<typeof ReviewJobDataSchema>

// ─────────────────────────────────────────────────────────────────────────────
// QA job — stage:'qa'
// ─────────────────────────────────────────────────────────────────────────────

export const QaJobDataSchema = z.object({
  storyId: z.string().min(1),
  stage: z.literal('qa'),
  attemptNumber: z.number().int().min(1),
  payload: StorySnapshotPayloadSchema,
  priority: z.number().int().optional(),
  touchedPathPrefixes: z.array(z.string()).default([]),
})

export type QaJobData = z.infer<typeof QaJobDataSchema>

// ─────────────────────────────────────────────────────────────────────────────
// Discriminated union of all pipeline job payloads
// ─────────────────────────────────────────────────────────────────────────────

export const PipelineJobDataSchema = z.discriminatedUnion('stage', [
  ElaborationJobDataSchema,
  StoryCreationJobDataSchema,
  ImplementationJobDataSchema,
  ReviewJobDataSchema,
  QaJobDataSchema,
])

export type PipelineJobData = z.infer<typeof PipelineJobDataSchema>
