import { FileUpload } from '../../../../../ui/src/FileUpload';
import { toast } from 'sonner';
import { Toaster } from '../ui/sonner';
import { validateFiles, sanitizeFileName, SECURITY_CONFIG } from './security';
import { UploadThrottle, DEFAULT_THROTTLE_CONFIG } from './throttle';
import type { UploadStatus, RetryInfo } from './types';
import { Clock, RefreshCw } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

export function FileUploadComponent() {
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>({
    activeUploads: 0,
    queueLength: 0,
    maxConcurrent: DEFAULT_THROTTLE_CONFIG.maxConcurrent,
  });
  const [retryInfo, setRetryInfo] = useState<RetryInfo | null>(null);
  const throttleRef = useRef<UploadThrottle>(
    new UploadThrottle(DEFAULT_THROTTLE_CONFIG)
  );

  // Update upload status from throttle
  useEffect(() => {
    const updateStatus = () => {
      setUploadStatus(throttleRef.current.getStatus());
    };

    const interval = setInterval(updateStatus, 500);
    return () => clearInterval(interval);
  }, []);

  const handleUpload = async (files: File[] | File) => {
    const fileArray = Array.isArray(files) ? files : [files];
    
    // Final validation before upload
    const validation = validateFiles(fileArray);
    
    if (!validation.isValid) {
      validation.errors.forEach(error => {
        toast.error(error);
      });
      return;
    }
    
    toast('Uploading files...');
    
    const uploadPromises = fileArray.map(async (file) => {
      const formData = new FormData();
      formData.append('file', file);
      
      // Add security headers
      const headers = {
        'X-File-Name': sanitizeFileName(file.name),
        'X-File-Size': file.size.toString(),
        'X-File-Type': file.type,
        'X-Upload-Timestamp': Date.now().toString(),
      };
      
      try {
        await throttleRef.current.addToQueue(
          async () => {
            const response = await fetch('https://httpbin.org/post', {
              method: 'POST',
              body: formData,
              headers,
            });
            return response.json();
          },
          () => {
            // Progress tracking removed - not used in current implementation
          },
          (attempt, error) => {
            setRetryInfo({
              attempt,
              maxAttempts: throttleRef.current['config'].maxRetries,
              error,
              delay: throttleRef.current['config'].retryDelay * Math.pow(throttleRef.current['config'].backoffMultiplier, attempt - 1),
            });
            
            toast.warning(`Retrying upload for ${sanitizeFileName(file.name)} (attempt ${attempt}/${throttleRef.current['config'].maxRetries})`);
          }
        );
        
        toast.success(`Successfully uploaded ${sanitizeFileName(file.name)}`);
      } catch (error) {
        console.error('Upload error:', error);
        toast.error(`Upload failed for ${sanitizeFileName(file.name)}`);
        throw error;
      }
    });

    await Promise.all(uploadPromises);
  };

  const handleError = (error: string) => {
    toast.error(error);
  };

  return (
    <>
      <Toaster />
      
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">File Upload</h1>
          <p className="text-gray-600">
            Upload your files securely with advanced validation and progress tracking
          </p>
        </div>

        {/* Upload Status */}
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Upload Status</h3>
            <div className="flex items-center justify-between space-x-2">
              <Clock className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-600">
                Active: {uploadStatus.activeUploads} | Queue: {uploadStatus.queueLength}
              </span>
            </div>
          </div>
          
          {retryInfo && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
              <div className="flex items-center space-x-2">
                <RefreshCw className="w-4 h-4 text-yellow-600 animate-spin" />
                <span className="text-sm text-yellow-800">
                  Retrying upload (attempt {retryInfo.attempt}/{retryInfo.maxAttempts})...
                </span>
              </div>
            </div>
          )}
        </div>

        {/* File Upload Component */}
        <FileUpload
          onUpload={handleUpload}
          onError={handleError}
          accept={Object.keys(SECURITY_CONFIG.ALLOWED_TYPES)}
          multiple={true}
          maxSizeMB={20}
          uploadButtonLabel="Upload Files"
          showPreview={true}
        />
      </div>
    </>
  );
} 