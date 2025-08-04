// Browser-specific exports - only frontend utilities
// Export browser-specific schemas (no Buffer)
export * from './schemas/index.browser.js'

// Export browser-specific types (no Buffer)
export * from './types/index.browser.js'

// Export frontend image processing utilities only
export {
  getImageMetadataFromFile,
  validateImageFile,
  processImageFile,
  createImageVariantsFile,
  createDataURL,
  dataURLToFile,
  getOptimalFormatFrontend
} from './utils/frontendProcessor.js'

// Export presets and configuration utilities
export {
  IMAGE_PRESETS,
  getPreset,
  createCustomPreset,
  getOptimalPreset,
  createResponsiveVariants,
  RESPONSIVE_BREAKPOINTS,
  createStandardResponsiveVariants
} from './utils/presets.js' 