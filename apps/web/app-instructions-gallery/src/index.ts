/**
 * @repo/instuctions-gallery
 *
 * Instructions Gallery module entry point for lazy-loading by main-app shell.
 */

export { InstuctionsGalleryModule, InstuctionsGalleryModule as default } from './Module'
export type { InstuctionsGalleryModuleProps } from './Module'

// Detail Module exports (for lazy loading by main-app)
export { InstructionsDetailModule } from './DetailModule'
export type { InstructionsDetailModuleProps } from './DetailModule'

// Detail Page exports
export { DetailPage, DetailPageSkeleton, DetailPageNotFound } from './pages/detail-page'
export type { DetailPageProps } from './pages/detail-page'

// Type exports
export { InstructionSchema, InstructionCardPropsSchema } from './__types__'
export type { Instruction, InstructionCardProps } from './__types__'
