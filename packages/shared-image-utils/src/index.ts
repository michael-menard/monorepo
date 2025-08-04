// Export all schemas
export * from './schemas/index'

// Export all types
export * from './types/index'

// Export backend image processing utilities
export {
  getImageMetadata,
  processImage,
  createImageVariants,
  getOptimalFormat,
  canProcessImage,
  calculateOptimalQuality
} from './utils/imageProcessor'

// Export frontend image processing utilities
export {
  getImageMetadataFromFile,
  validateImageFile,
  processImageFile,
  createImageVariantsFile,
  createDataURL,
  dataURLToFile,
  getOptimalFormatFrontend
} from './utils/frontendProcessor'

// Export presets and configuration utilities
export {
  IMAGE_PRESETS,
  getPreset,
  createCustomPreset,
  getOptimalPreset,
  createResponsiveVariants,
  RESPONSIVE_BREAKPOINTS,
  createStandardResponsiveVariants
} from './utils/presets' 