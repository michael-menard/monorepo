export type FileWithProgress = {
  id: string;
  file: File;
  progress: number;
  uploaded: boolean;
  sanitizedName: string;
};

// Throttle and retry types
export interface UploadStatus {
  activeUploads: number;
  queueLength: number;
  maxConcurrent: number;
}

export interface RetryInfo {
  attempt: number;
  maxAttempts: number;
  error: Error;
  delay: number;
}

export interface ThrottleConfig {
  maxConcurrent: number;
  delayBetweenRequests: number;
  maxRetries: number;
  retryDelay: number;
  backoffMultiplier: number;
} 