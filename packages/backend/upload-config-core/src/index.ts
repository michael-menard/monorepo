/**
 * @repo/upload-config-core
 *
 * Platform-agnostic upload configuration business logic.
 * No dependencies on AWS Lambda, Vercel, or any platform-specific types.
 */

export * from './__types__/index.js'
export { loadUploadConfigFromEnv, getPublicUploadConfig } from './config-loader.js'
