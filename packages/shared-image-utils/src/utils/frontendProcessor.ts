import type {
  ImageProcessingConfig,
  ImageMetadata,
  ImageOptimizationStats,
  FrontendImageProcessingOptions,
  ValidationResult
} from '../types/index.js'
import { ImageProcessingConfigSchema, ImageValidationSchema } from '../schemas/index.js'

/**
 * Get image metadata from File object
 */
export async function getImageMetadataFromFile(file: File): Promise<ImageMetadata> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')

    img.onload = () => {
      canvas.width = img.width
      canvas.height = img.height
      
      if (ctx) {
        ctx.drawImage(img, 0, 0)
        
        // Check for transparency
        const imageData = ctx.getImageData(0, 0, img.width, img.height)
        const hasAlpha = imageData.data.some((_, index) => (index + 1) % 4 === 0 && imageData.data[index] < 255)
        
        resolve({
          width: img.width,
          height: img.height,
          format: file.type.split('/')[1] || 'unknown',
          size: file.size,
          hasAlpha,
          isOpaque: !hasAlpha,
          orientation: undefined // EXIF orientation not available in frontend
        })
      } else {
        reject(new Error('Failed to get canvas context'))
      }
    }

    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = URL.createObjectURL(file)
  })
}

/**
 * Validate image file
 */
export function validateImageFile(
  file: File,
  validation: Partial<{ maxSizeMB: number; allowedTypes: string[]; minWidth?: number; minHeight?: number; maxWidth?: number; maxHeight?: number }> = {}
): ValidationResult {
  const validatedValidation = ImageValidationSchema.parse(validation)
  const errors: string[] = []
  const warnings: string[] = []

  // Check file type
  if (!validatedValidation.allowedTypes.includes(file.type)) {
    errors.push(`File type ${file.type} is not supported`)
  }

  // Check file size
  const fileSizeMB = file.size / (1024 * 1024)
  if (fileSizeMB > validatedValidation.maxSizeMB) {
    errors.push(`File size ${fileSizeMB.toFixed(2)}MB exceeds maximum ${validatedValidation.maxSizeMB}MB`)
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * Process and optimize an image file on the frontend
 */
export async function processImageFile(
  options: FrontendImageProcessingOptions
): Promise<{ file: File; stats: ImageOptimizationStats }> {
  const startTime = Date.now()
  const originalSize = options.file.size

  return new Promise((resolve, reject) => {
    try {
      // Validate configuration
      const validatedConfig = ImageProcessingConfigSchema.parse(options.config)
      
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const img = new Image()

      img.onload = async () => {
        try {
          // Get original metadata
          const metadata = await getImageMetadataFromFile(options.file)
          
          // Calculate new dimensions
          const needsResize = metadata.width > validatedConfig.maxWidth || metadata.height > validatedConfig.maxHeight
          
          let newWidth = metadata.width
          let newHeight = metadata.height

          if (needsResize) {
            const ratio = Math.min(
              validatedConfig.maxWidth / metadata.width,
              validatedConfig.maxHeight / metadata.height
            )
            newWidth = Math.round(metadata.width * ratio)
            newHeight = Math.round(metadata.height * ratio)
          }

          // Set canvas dimensions
          canvas.width = newWidth
          canvas.height = newHeight

          if (!ctx) {
            throw new Error('Failed to get canvas context')
          }

          // Apply image processing
          ctx.imageSmoothingEnabled = true
          ctx.imageSmoothingQuality = 'high'

          // Draw image with fit mode
          if (validatedConfig.fit === 'cover') {
            // Crop to cover
            const scale = Math.max(newWidth / metadata.width, newHeight / metadata.height)
            const scaledWidth = metadata.width * scale
            const scaledHeight = metadata.height * scale
            const x = (newWidth - scaledWidth) / 2
            const y = (newHeight - scaledHeight) / 2
            
            ctx.drawImage(img, x, y, scaledWidth, scaledHeight)
          } else {
            // Contain or other modes
            ctx.drawImage(img, 0, 0, newWidth, newHeight)
          }

          // Convert to blob with specified format and quality
          const mimeType = `image/${validatedConfig.format}`
          const quality = validatedConfig.quality / 100

          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Failed to create image blob'))
                return
              }

              const processedFile = new File([blob], options.file.name, {
                type: mimeType,
                lastModified: Date.now()
              })

              const processingTime = Date.now() - startTime
              const optimizedSize = processedFile.size
              const compressionRatio = 1 - (optimizedSize / originalSize)

              const stats: ImageOptimizationStats = {
                originalSize,
                optimizedSize,
                compressionRatio,
                processingTime,
                format: validatedConfig.format,
                quality: validatedConfig.quality
              }

              resolve({ file: processedFile, stats })
            },
            mimeType,
            quality
          )
        } catch (error) {
          reject(error)
        }
      }

      img.onerror = () => reject(new Error('Failed to load image'))
      img.src = URL.createObjectURL(options.file)
    } catch (error) {
      reject(error)
    }
  })
}

/**
 * Create multiple image variants on the frontend
 */
export async function createImageVariantsFile(
  file: File,
  variants: Array<{ name: string; config: Partial<ImageProcessingConfig> }>,
  onProgress?: (progress: number) => void
): Promise<Array<{ name: string; file: File; stats: ImageOptimizationStats }>> {
  const results: Array<{ name: string; file: File; stats: ImageOptimizationStats }> = []
  const totalVariants = variants.length

  for (let i = 0; i < variants.length; i++) {
    const variant = variants[i]
    
    try {
      const { file: processedFile, stats } = await processImageFile({
        file,
        config: variant.config as ImageProcessingConfig
      })

      results.push({
        name: variant.name,
        file: processedFile,
        stats
      })

      // Update progress
      if (onProgress) {
        onProgress((i + 1) / totalVariants)
      }
    } catch (error) {
      console.error(`Failed to create variant ${variant.name}:`, error)
      // Continue with other variants
    }
  }

  return results
}

/**
 * Create a data URL from a file
 */
export function createDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}

/**
 * Convert data URL to File object
 */
export function dataURLToFile(dataURL: string, filename: string, mimeType: string): File {
  const arr = dataURL.split(',')
  const bstr = atob(arr[1])
  let n = bstr.length
  const u8arr = new Uint8Array(n)
  
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n)
  }
  
  return new File([u8arr], filename, { type: mimeType })
}

/**
 * Get optimal format for frontend processing
 */
export function getOptimalFormatFrontend(
  filename: string,
  mimetype: string,
  hasAlpha: boolean = false
): 'jpeg' | 'png' | 'webp' {
  const ext = filename.toLowerCase().split('.').pop()
  
  // Check WebP support
  const supportsWebP = document.createElement('canvas')
    .toDataURL('image/webp')
    .indexOf('data:image/webp') === 0
  
  if (supportsWebP && (ext === 'webp' || mimetype === 'image/webp')) {
    return 'webp'
  }
  
  // Use PNG for images with transparency
  if (hasAlpha || ext === 'png' || mimetype === 'image/png') {
    return 'png'
  }
  
  // Default to JPEG
  return 'jpeg'
} 