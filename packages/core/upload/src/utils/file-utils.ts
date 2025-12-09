import type { UploadFile } from '../types/index.js'

export const generateFileId = (): string => {
  return crypto.randomUUID()
}

export const createUploadFile = (file: File): UploadFile => {
  return {
    id: generateFileId(),
    file,
    status: 'pending',
    progress: 0,
  }
}

export const createFilePreviewUrl = (file: File): string => {
  return URL.createObjectURL(file)
}

export const revokeFilePreviewUrl = (url: string): void => {
  URL.revokeObjectURL(url)
}

export const readFileAsDataURL = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}

export const readFileAsArrayBuffer = (file: File): Promise<ArrayBuffer> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as ArrayBuffer)
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsArrayBuffer(file)
  })
}

export const readFileAsText = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsText(file)
  })
}

export const getImageDimensions = (file: File): Promise<{ width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('File is not an image'))
      return
    }

    const img = new Image()
    const url = createFilePreviewUrl(file)

    img.onload = () => {
      revokeFilePreviewUrl(url)
      resolve({
        width: img.naturalWidth,
        height: img.naturalHeight,
      })
    }

    img.onerror = () => {
      revokeFilePreviewUrl(url)
      reject(new Error('Failed to load image'))
    }

    img.src = url
  })
}

export const compressImage = (
  file: File,
  maxWidth: number = 1920,
  maxHeight: number = 1080,
  quality: number = 0.8,
): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('File is not an image'))
      return
    }

    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()
    const url = createFilePreviewUrl(file)

    img.onload = () => {
      // Calculate new dimensions
      let { width, height } = img

      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height)
        width *= ratio
        height *= ratio
      }

      canvas.width = width
      canvas.height = height

      // Draw and compress
      ctx?.drawImage(img, 0, 0, width, height)

      canvas.toBlob(
        blob => {
          revokeFilePreviewUrl(url)
          if (blob) {
            resolve(blob)
          } else {
            reject(new Error('Failed to compress image'))
          }
        },
        file.type,
        quality,
      )
    }

    img.onerror = () => {
      revokeFilePreviewUrl(url)
      reject(new Error('Failed to load image'))
    }

    img.src = url
  })
}

export const convertFileToBase64 = (file: File): Promise<string> => {
  return readFileAsDataURL(file)
}

export const dataURLtoFile = (dataURL: string, filename: string): File => {
  const arr = dataURL.split(',')
  const mime = arr[0].match(/:(.*?);/)?.[1] || ''
  const bstr = atob(arr[1])
  let n = bstr.length
  const u8arr = new Uint8Array(n)

  while (n--) {
    u8arr[n] = bstr.charCodeAt(n)
  }

  return new File([u8arr], filename, { type: mime })
}
