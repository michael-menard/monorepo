import { z } from 'zod';

// Download progress schema
export const downloadProgressSchema = z.object({
  loaded: z.number(),
  total: z.number(),
  percentage: z.number().min(0).max(100),
  speed: z.number(), // bytes per second
  estimatedTime: z.number(), // seconds
});

// Download info schema
export const downloadInfoSchema = z.object({
  url: z.string().url(),
  filename: z.string(),
  mimeType: z.string(),
  size: z.number().optional(),
  expiresAt: z.date().optional(),
});

// Download result schema
export const downloadResultSchema = z.object({
  success: z.boolean(),
  filename: z.string(),
  size: z.number(),
  error: z.string().optional(),
});

export type DownloadProgress = z.infer<typeof downloadProgressSchema>;
export type DownloadInfo = z.infer<typeof downloadInfoSchema>;
export type DownloadResult = z.infer<typeof downloadResultSchema>;

// Download options
export interface DownloadOptions {
  onProgress?: (progress: DownloadProgress) => void;
  onError?: (error: string) => void;
  onComplete?: (result: DownloadResult) => void;
  timeout?: number; // milliseconds
  retries?: number;
  retryDelay?: number; // milliseconds
}

// Default options
const DEFAULT_OPTIONS: Required<DownloadOptions> = {
  onProgress: () => {},
  onError: () => {},
  onComplete: () => {},
  timeout: 30000, // 30 seconds
  retries: 3,
  retryDelay: 1000, // 1 second
};

// Utility functions
const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const calculateSpeed = (loaded: number, startTime: number): number => {
  const elapsed = (Date.now() - startTime) / 1000; // seconds
  return elapsed > 0 ? loaded / elapsed : 0;
};

const calculateEstimatedTime = (loaded: number, total: number, speed: number): number => {
  if (speed <= 0) return 0;
  const remaining = total - loaded;
  return remaining / speed;
};

// Main download function
export const downloadFile = async (
  downloadInfo: DownloadInfo,
  options: DownloadOptions = {}
): Promise<DownloadResult> => {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let attempt = 0;

  while (attempt <= opts.retries) {
    try {
      return await performDownload(downloadInfo, opts);
    } catch (error) {
      attempt++;
      const errorMessage = error instanceof Error ? error.message : 'Unknown download error';
      
      if (attempt > opts.retries) {
        opts.onError(`Download failed after ${opts.retries} attempts: ${errorMessage}`);
        return {
          success: false,
          filename: downloadInfo.filename,
          size: 0,
          error: errorMessage,
        };
      }

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, opts.retryDelay));
    }
  }

  return {
    success: false,
    filename: downloadInfo.filename,
    size: 0,
    error: 'Download failed after all retries',
  };
};

// Perform the actual download
const performDownload = async (
  downloadInfo: DownloadInfo,
  options: Required<DownloadOptions>
): Promise<DownloadResult> => {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    let loaded = 0;
    let total = 0;

    // Create XMLHttpRequest for progress tracking
    const xhr = new XMLHttpRequest();

    // Set up progress tracking
    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) {
        loaded = event.loaded;
        total = event.total;
        
        const progress: DownloadProgress = {
          loaded,
          total,
          percentage: Math.round((loaded / total) * 100),
          speed: calculateSpeed(loaded, startTime),
          estimatedTime: calculateEstimatedTime(loaded, total, calculateSpeed(loaded, startTime)),
        };
        
        options.onProgress(progress);
      }
    });

    // Handle load completion
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        // Create blob from response
        const blob = new Blob([xhr.response], { type: downloadInfo.mimeType });
        
        // Create download link
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = downloadInfo.filename;
        
        // Trigger download
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up
        window.URL.revokeObjectURL(url);
        
        const result: DownloadResult = {
          success: true,
          filename: downloadInfo.filename,
          size: blob.size,
        };
        
        options.onComplete(result);
        resolve(result);
      } else {
        const error = `HTTP ${xhr.status}: ${xhr.statusText}`;
        options.onError(error);
        reject(new Error(error));
      }
    });

    // Handle errors
    xhr.addEventListener('error', () => {
      const error = 'Network error occurred during download';
      options.onError(error);
      reject(new Error(error));
    });

    xhr.addEventListener('timeout', () => {
      const error = `Download timeout after ${options.timeout}ms`;
      options.onError(error);
      reject(new Error(error));
    });

    // Set up request
    xhr.open('GET', downloadInfo.url, true);
    xhr.responseType = 'blob';
    xhr.timeout = options.timeout;
    
    // Add headers for better compatibility
    xhr.setRequestHeader('Accept', downloadInfo.mimeType);
    xhr.setRequestHeader('Cache-Control', 'no-cache');
    
    // Send request
    xhr.send();
  });
};

// Batch download function for multiple files
export const downloadMultipleFiles = async (
  files: DownloadInfo[],
  options: DownloadOptions & { concurrent?: number } = {}
): Promise<DownloadResult[]> => {
  const { concurrent = 3, ...downloadOptions } = options;
  const results: DownloadResult[] = [];
  
  // Process files in batches
  for (let i = 0; i < files.length; i += concurrent) {
    const batch = files.slice(i, i + concurrent);
    const batchPromises = batch.map(file => downloadFile(file, downloadOptions));
    const batchResults = await Promise.allSettled(batchPromises);
    
    // Convert results
    batchResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        results.push({
          success: false,
          filename: batch[index].filename,
          size: 0,
          error: result.reason?.message || 'Download failed',
        });
      }
    });
  }
  
  return results;
};

// Utility function to get file extension from filename
export const getFileExtension = (filename: string): string => {
  return filename.split('.').pop()?.toLowerCase() || '';
};

// Utility function to get file type icon
export const getFileTypeIcon = (filename: string): string => {
  const ext = getFileExtension(filename);
  const iconMap: Record<string, string> = {
    pdf: '📄',
    io: '🔗',
    csv: '📊',
    xml: '📋',
    json: '📄',
    jpg: '🖼️',
    jpeg: '🖼️',
    png: '🖼️',
    gif: '🖼️',
    webp: '🖼️',
    zip: '📦',
    rar: '📦',
    '7z': '📦',
  };
  return iconMap[ext] || '📄';
};



// Utility function to validate download info
export const validateDownloadInfo = (info: unknown): DownloadInfo => {
  return downloadInfoSchema.parse(info);
};

// Schemas are already exported at the top of the file 