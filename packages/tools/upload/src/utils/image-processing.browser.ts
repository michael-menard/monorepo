// Browser-only image processing using Canvas API
import type { ImageProcessingOptions } from '../types/index.js'

export const processImageBrowser = async (
  file: File,
  options: ImageProcessingOptions,
): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')

    if (!ctx) {
      reject(new Error('Canvas context not available'))
      return
    }

    img.onload = () => {
      const { naturalWidth: originalWidth, naturalHeight: originalHeight } = img

      // Calculate target dimensions
      let targetWidth = options.width || originalWidth
      let targetHeight = options.height || originalHeight

      // Apply fit logic
      if (options.width && options.height) {
        const aspectRatio = originalWidth / originalHeight
        const targetAspectRatio = options.width / options.height

        switch (options.fit) {
          case 'contain':
            if (aspectRatio > targetAspectRatio) {
              targetHeight = options.width / aspectRatio
            } else {
              targetWidth = options.height * aspectRatio
            }
            break
          case 'cover':
            if (aspectRatio > targetAspectRatio) {
              targetWidth = options.height * aspectRatio
            } else {
              targetHeight = options.width / aspectRatio
            }
            break
          case 'fill':
            // Use specified dimensions exactly
            break
          case 'inside':
            if (originalWidth > options.width || originalHeight > options.height) {
              if (aspectRatio > targetAspectRatio) {
                targetHeight = options.width / aspectRatio
              } else {
                targetWidth = options.height * aspectRatio
              }
            } else {
              targetWidth = originalWidth
              targetHeight = originalHeight
            }
            break
          case 'outside':
            if (originalWidth < options.width && originalHeight < options.height) {
              if (aspectRatio > targetAspectRatio) {
                targetWidth = options.height * aspectRatio
              } else {
                targetHeight = options.width / aspectRatio
              }
            }
            break
        }
      }

      canvas.width = targetWidth
      canvas.height = targetHeight

      // Draw image
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight)

      // Convert to blob
      canvas.toBlob(
        blob => {
          URL.revokeObjectURL(img.src)
          if (blob) {
            resolve(blob)
          } else {
            reject(new Error('Failed to process image'))
          }
        },
        `image/${options.format || 'jpeg'}`,
        (options.quality || 85) / 100,
      )
    }

    img.onerror = () => {
      URL.revokeObjectURL(img.src)
      reject(new Error('Failed to load image'))
    }

    img.src = URL.createObjectURL(file)
  })
}

export const cropImageBrowser = async (
  file: File,
  x: number,
  y: number,
  width: number,
  height: number,
  options: Partial<ImageProcessingOptions> = {},
): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')

    if (!ctx) {
      reject(new Error('Canvas context not available'))
      return
    }

    img.onload = () => {
      canvas.width = width
      canvas.height = height

      // Draw cropped image
      ctx.drawImage(img, x, y, width, height, 0, 0, width, height)

      // Convert to blob
      canvas.toBlob(
        blob => {
          URL.revokeObjectURL(img.src)
          if (blob) {
            resolve(blob)
          } else {
            reject(new Error('Failed to crop image'))
          }
        },
        `image/${options.format || 'jpeg'}`,
        (options.quality || 85) / 100,
      )
    }

    img.onerror = () => {
      URL.revokeObjectURL(img.src)
      reject(new Error('Failed to load image'))
    }

    img.src = URL.createObjectURL(file)
  })
}

export const getImageMetadataBrowser = async (file: File) => {
  return new Promise((resolve, reject) => {
    const img = new Image()

    img.onload = () => {
      const metadata = {
        width: img.naturalWidth,
        height: img.naturalHeight,
        format: file.type.split('/')[1],
        size: file.size,
        density: window.devicePixelRatio || 1,
      }

      URL.revokeObjectURL(img.src)
      resolve(metadata)
    }

    img.onerror = () => {
      URL.revokeObjectURL(img.src)
      reject(new Error('Failed to load image metadata'))
    }

    img.src = URL.createObjectURL(file)
  })
}

export const resizeImageBrowser = async (
  file: File,
  maxWidth: number,
  maxHeight: number,
  quality: number = 85,
): Promise<Blob> => {
  return processImageBrowser(file, {
    width: maxWidth,
    height: maxHeight,
    fit: 'inside',
    quality,
    format: file.type.split('/')[1] as any,
  })
}

export const convertImageFormatBrowser = async (
  file: File,
  format: 'jpeg' | 'png' | 'webp',
  quality: number = 85,
): Promise<Blob> => {
  return processImageBrowser(file, {
    format,
    quality,
  })
}
