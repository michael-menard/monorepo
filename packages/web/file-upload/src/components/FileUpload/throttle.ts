// Throttle utility for controlling upload rates
export interface ThrottleConfig {
  maxConcurrent: number;
  delayBetweenRequests: number;
  maxRetries: number;
  retryDelay: number;
  backoffMultiplier: number;
}

export const DEFAULT_THROTTLE_CONFIG: ThrottleConfig = {
  maxConcurrent: 3, // Maximum concurrent uploads
  delayBetweenRequests: 1000, // 1 second between requests
  maxRetries: 3, // Maximum retry attempts
  retryDelay: 2000, // Initial retry delay (2 seconds)
  backoffMultiplier: 2, // Exponential backoff multiplier
};

// Throttle class for managing concurrent uploads
export class UploadThrottle {
  private config: ThrottleConfig;
  private activeUploads = 0;
  private queue: Array<() => Promise<void>> = [];
  private processing = false;

  constructor(config: Partial<ThrottleConfig> = {}) {
    this.config = { ...DEFAULT_THROTTLE_CONFIG, ...config };
  }

  // Add upload to queue and process if possible
  async addToQueue<T>(
    uploadFn: () => Promise<T>,
    _onProgress?: (progress: number) => void,
    onRetry?: (attempt: number, error: Error) => void
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const wrappedUpload = async (): Promise<void> => {
        
        for (let attempt = 1; attempt <= this.config.maxRetries + 1; attempt++) {
          try {
            const result = await uploadFn();
            resolve(result);
            return;
          } catch (error) {
            
            if (attempt <= this.config.maxRetries) {
              const delay = this.config.retryDelay * Math.pow(this.config.backoffMultiplier, attempt - 1);
              
              onRetry?.(attempt, error as Error);
              
              // Wait before retrying
              await new Promise(resolve => setTimeout(resolve, delay));
            } else {
              reject(error);
              return;
            }
          }
        }
      };

      this.queue.push(wrappedUpload);
      this.processQueue();
    });
  }

  // Process queue with throttling
  private async processQueue(): Promise<void> {
    if (this.processing || this.activeUploads >= this.config.maxConcurrent) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0 && this.activeUploads < this.config.maxConcurrent) {
      const upload = this.queue.shift();
      if (!upload) break;

      this.activeUploads++;
      
      // Process upload
      upload().finally(() => {
        this.activeUploads--;
        
        // Add delay between requests
        setTimeout(() => {
          this.processQueue();
        }, this.config.delayBetweenRequests);
      });
    }

    this.processing = false;
  }

  // Get current queue status
  getStatus() {
    return {
      activeUploads: this.activeUploads,
      queueLength: this.queue.length,
      maxConcurrent: this.config.maxConcurrent,
    };
  }

  // Clear queue
  clearQueue(): void {
    this.queue = [];
  }

  // Update configuration
  updateConfig(config: Partial<ThrottleConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

// Utility function to create a throttled upload function
export function createThrottledUpload(
  config: Partial<ThrottleConfig> = {}
): UploadThrottle {
  return new UploadThrottle(config);
}

// Exponential backoff utility
export function calculateBackoffDelay(
  attempt: number,
  baseDelay: number = 1000,
  multiplier: number = 2,
  maxDelay: number = 30000
): number {
  const delay = baseDelay * Math.pow(multiplier, attempt - 1);
  return Math.min(delay, maxDelay);
}

// Jitter utility to prevent thundering herd
export function addJitter(delay: number, jitterPercent: number = 0.1): number {
  const jitter = delay * jitterPercent * Math.random();
  return delay + jitter;
} 