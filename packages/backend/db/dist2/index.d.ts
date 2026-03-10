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
export { db, getPool, closePool, testConnection } from './client.js';
export * from './schema.js';
export * from './generated-schemas.js';
export { insertWorkflowEvent } from './workflow-events.js';
export type { WorkflowEventInput } from './workflow-events.js';
export { WorkflowEventSchemas, ItemStateChangedPayloadSchema, StepCompletedPayloadSchema, StoryChangedPayloadSchema, GapFoundPayloadSchema, FlowIssuePayloadSchema, } from './workflow-events/schemas.js';
export type { ItemStateChangedPayload, StepCompletedPayload, StoryChangedPayload, GapFoundPayload, FlowIssuePayload, EventTypePayloadMap, WorkflowEventType, } from './workflow-events/schemas.js';
export { createItemStateChangedEvent, createStepCompletedEvent, createStoryChangedEvent, createGapFoundEvent, createFlowIssueEvent, } from './workflow-events/helpers.js';
export { initTelemetrySdk, getSdkInstance, validateConfig, DEFAULT_SDK_CONFIG } from './telemetry-sdk/index.js';
export type { TelemetrySdkConfig, TelemetrySdk, StepTrackingOptions, StateTrackingOptions, BufferedEvent, BufferState, } from './telemetry-sdk/index.js';
export { insertWorkflowEventsBatch, chunkArray, BATCH_CHUNK_SIZE } from './telemetry-sdk/index.js';
//# sourceMappingURL=index.d.ts.map