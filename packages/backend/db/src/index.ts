/**
 * @monorepo/db
 *
 * Shared database client and schema for Lambda functions
 *
 * Usage:
 * ```typescript
 * // Import everything
 * import { db, galleryImages, wishlistImages } from '@repo/db';
 *
 * // Or import separately
 * import { db } from '@repo/db/client';
 * import * as schema from '@repo/db/schema';
 * import { galleryImageSchemas, createGalleryImageSchema } from '@repo/db/generated-schemas';
 * ```
 */

export { db, getPool, closePool, testConnection } from './client'
export * from './schema'
export * from './generated-schemas'
export { insertWorkflowEvent } from './workflow-events'
export type { WorkflowEventInput } from './workflow-events'

// INFR-0041: Export workflow event schemas and helpers
export {
  WorkflowEventSchemas,
  ItemStateChangedPayloadSchema,
  StepCompletedPayloadSchema,
  StoryChangedPayloadSchema,
  GapFoundPayloadSchema,
  FlowIssuePayloadSchema,
} from './workflow-events/schemas'
export type {
  ItemStateChangedPayload,
  StepCompletedPayload,
  StoryChangedPayload,
  GapFoundPayload,
  FlowIssuePayload,
  EventTypePayloadMap,
  WorkflowEventType,
} from './workflow-events/schemas'
export {
  createItemStateChangedEvent,
  createStepCompletedEvent,
  createStoryChangedEvent,
  createGapFoundEvent,
  createFlowIssueEvent,
} from './workflow-events/helpers'
