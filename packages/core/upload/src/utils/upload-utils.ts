import type { UploadFile, UploadConfig, UploadProgress } from '../types/index.js'

export const uploadSingleFile = async (
  file: File,
  config: UploadConfig,
  onProgress?: (progress: UploadProgress) => void,
): Promise<{ url: string; metadata?: Record<string, any> }> => {
  if (!config.endpoint) {
    throw new Error('Upload endpoint is required')
  }

  const formData = new FormData()
  formData.append('file', file)

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()

    // Track upload progress
    xhr.upload.addEventListener('progress', event => {
      if (event.lengthComputable && onProgress) {
        const progress: UploadProgress = {
          loaded: event.loaded,
          total: event.total,
          percentage: Math.round((event.loaded / event.total) * 100),
        }
        onProgress(progress)
      }
    })

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText)
          resolve(response)
        } catch (error) {
          reject(new Error('Invalid response format'))
        }
      } else {
        reject(new Error(`Upload failed with status ${xhr.status}`))
      }
    })

    xhr.addEventListener('error', () => {
      reject(new Error('Upload failed due to network error'))
    })

    xhr.addEventListener('abort', () => {
      reject(new Error('Upload was aborted'))
    })

    xhr.open('POST', config.endpoint!)
    // Include cookies for auth and accept JSON response
    xhr.withCredentials = true
    xhr.setRequestHeader('Accept', 'application/json')

    // Add custom headers
    if (config.headers) {
      Object.entries(config.headers).forEach(([key, value]) => {
        xhr.setRequestHeader(key, value)
      })
    }

    xhr.send(formData)
  })
}

export const uploadFiles = async (
  files: File[],
  config: UploadConfig,
  onProgress?: (progress: UploadProgress, file: File) => void,
): Promise<UploadFile[]> => {
  const uploadPromises = files.map(async file => {
    const uploadFile: UploadFile = {
      id: crypto.randomUUID(),
      file,
      status: 'uploading',
      progress: 0,
    }

    try {
      const result = await uploadSingleFile(file, config, progress => {
        uploadFile.progress = progress.percentage
        onProgress?.(progress, file)
      })

      uploadFile.status = 'completed'
      uploadFile.progress = 100
      uploadFile.url = result.url
      uploadFile.metadata = result.metadata

      return uploadFile
    } catch (error) {
      uploadFile.status = 'error'
      uploadFile.error = error instanceof Error ? error.message : 'Upload failed'
      return uploadFile
    }
  })

  return Promise.all(uploadPromises)
}

export const cancelUpload = (xhr: XMLHttpRequest): void => {
  xhr.abort()
}

export const retryUpload = async (
  uploadFile: UploadFile,
  config: UploadConfig,
  onProgress?: (progress: UploadProgress) => void,
): Promise<UploadFile> => {
  uploadFile.status = 'uploading'
  uploadFile.progress = 0
  uploadFile.error = undefined

  try {
    const result = await uploadSingleFile(uploadFile.file, config, onProgress)
    uploadFile.status = 'completed'
    uploadFile.progress = 100
    uploadFile.url = result.url
    uploadFile.metadata = result.metadata
  } catch (error) {
    uploadFile.status = 'error'
    uploadFile.error = error instanceof Error ? error.message : 'Upload failed'
  }

  return uploadFile
}

export const calculateTotalProgress = (files: UploadFile[]): number => {
  if (files.length === 0) return 0

  const totalProgress = files.reduce((sum, file) => sum + file.progress, 0)
  return Math.round(totalProgress / files.length)
}

export const getUploadStats = (files: UploadFile[]) => {
  const stats = {
    total: files.length,
    pending: 0,
    uploading: 0,
    processing: 0,
    completed: 0,
    error: 0,
    cancelled: 0,
  }

  files.forEach(file => {
    stats[file.status]++
  })

  return stats
}

export const isUploadComplete = (files: UploadFile[]): boolean => {
  return files.every(file => file.status === 'completed' || file.status === 'error')
}

export const hasUploadErrors = (files: UploadFile[]): boolean => {
  return files.some(file => file.status === 'error')
}

export const getFailedUploads = (files: UploadFile[]): UploadFile[] => {
  return files.filter(file => file.status === 'error')
}

export const getSuccessfulUploads = (files: UploadFile[]): UploadFile[] => {
  return files.filter(file => file.status === 'completed')
}
