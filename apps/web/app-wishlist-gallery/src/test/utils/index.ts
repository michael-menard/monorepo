/**
 * Test utilities for S3 upload testing
 *
 * Story: WISH-2120
 *
 * This is the entry point for test utilities. Import utilities from here:
 * @example
 * ```ts
 * import { createMockFile, mockS3Upload } from '@/test/utils'
 * ```
 */

export { createMockFile, CreateMockFileOptionsSchema } from './createMockFile'
export type { CreateMockFileOptions } from './createMockFile'

export {
  mockS3Upload,
  MockS3UploadOptionsSchema,
  MockS3UploadScenarioSchema,
} from './mockS3Upload'
export type {
  MockS3UploadOptions,
  MockS3UploadScenario,
  MockS3UploadCleanup,
} from './mockS3Upload'
