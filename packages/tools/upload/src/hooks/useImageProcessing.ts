import { useState, useCallback } from 'react';
import type { ImageProcessingOptions } from '../types/index.js';
import { processImageBrowser } from '../utils/image-processing.browser.js';

export interface UseImageProcessingOptions {
  onProcessingComplete?: (processedFile: Blob) => void;
  onProcessingError?: (error: Error) => void;
}

export interface UseImageProcessingReturn {
  isProcessing: boolean;
  processImage: (file: File, options: ImageProcessingOptions) => Promise<Blob>;
  error: Error | null;
}

export const useImageProcessing = (options: UseImageProcessingOptions = {}): UseImageProcessingReturn => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const processImage = useCallback(async (file: File, processingOptions: ImageProcessingOptions) => {
    setIsProcessing(true);
    setError(null);

    try {
      const processedBlob = await processImageBrowser(file, processingOptions);
      options.onProcessingComplete?.(processedBlob);
      return processedBlob;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Image processing failed');
      setError(error);
      options.onProcessingError?.(error);
      throw error;
    } finally {
      setIsProcessing(false);
    }
  }, [options]);

  return {
    isProcessing,
    processImage,
    error,
  };
};
