import axios from 'axios';
import { useRef, useState, useCallback, useEffect } from 'react';
import type { ChangeEvent, DragEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import { FileList } from './FileList';
import { CompletedFileItem } from './CompletedFileItem';
import type { FileWithProgress } from './types';
import { AnimatePresence, motion } from 'framer-motion';
import { validateFiles, generateSecureFileId, sanitizeFileName, SECURITY_CONFIG } from './security';
import { UploadThrottle, DEFAULT_THROTTLE_CONFIG } from './throttle';
import type { UploadStatus, RetryInfo } from './types';
import { Clock, RefreshCw } from 'lucide-react';

export function FileUpload() {
  const [files, setFiles] = useState<FileWithProgress[]>([]);
  const [completedFiles, setCompletedFiles] = useState<FileWithProgress[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);

  const [uploadStatus, setUploadStatus] = useState<UploadStatus>({
    activeUploads: 0,
    queueLength: 0,
    maxConcurrent: DEFAULT_THROTTLE_CONFIG.maxConcurrent,
  });
  const [retryInfo, setRetryInfo] = useState<RetryInfo | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
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

  const onFiles = useCallback((fileList: FileList) => {
    const newFiles = Array.from(fileList);
    
    // Validate files (combine existing files and new files)
    const existingFiles = files.map(f => f.file);
    const allFiles = [...existingFiles, ...newFiles];
    const validation = validateFiles(allFiles);
    
    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      setValidationWarnings(validation.warnings);
      
      // Show errors to user
      validation.errors.forEach(error => {
        toast.error(error);
      });
      
      validation.warnings.forEach(warning => {
        toast.warning(warning);
      });
      
      return;
    }
    
    // Clear previous validation messages
    setValidationErrors([]);
    setValidationWarnings([]);
    
    // Process valid files
    const validFiles = newFiles.map((file) => ({
      file,
      progress: 0,
      uploaded: false,
      id: generateSecureFileId(),
      sanitizedName: sanitizeFileName(file.name),
    }));
    
    setFiles((prev) => [...prev, ...validFiles]);
    
    // Show success message
    if (validFiles.length > 0) {
      toast.success(`${validFiles.length} file(s) added successfully`);
    }
  }, [files]);

  function handleFileSelect(e: ChangeEvent<HTMLInputElement>) {
    if (e.target.files?.length) {
      onFiles(e.target.files);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files?.length) {
      onFiles(e.dataTransfer.files);
    }
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragActive(true);
  }

  function handleDragLeave(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragActive(false);
  }

  async function handleUpload() {
    if (files.length === 0 || uploading) return;
    
    // Final validation before upload
    const fileArray = files.map(f => f.file);
    const validation = validateFiles(fileArray);
    
    if (!validation.isValid) {
      validation.errors.forEach(error => {
        toast.error(error);
      });
      return;
    }
    
    setUploading(true);
    toast('Uploading files...');
    
    const uploadPromises = files.map(async (fileWithProgress) => {
      const formData = new FormData();
      formData.append('file', fileWithProgress.file);
      
      // Add security headers
      const headers = {
        'X-File-Name': fileWithProgress.sanitizedName,
        'X-File-Size': fileWithProgress.file.size.toString(),
        'X-File-Type': fileWithProgress.file.type,
        'X-Upload-Timestamp': Date.now().toString(),
      };
      
      try {
        await throttleRef.current.addToQueue(
          async () => {
            const response = await axios.post('https://httpbin.org/post', formData, {
              headers,
              onUploadProgress: (progressEvent) => {
                const progress = Math.round(
                  (progressEvent.loaded * 100) / (progressEvent.total || 1),
                );
                setFiles((prevFiles) =>
                  prevFiles.map((file) =>
                    file.id === fileWithProgress.id ? { ...file, progress } : file,
                  ),
                );
              },
              timeout: 30000, // 30 second timeout
            });
            return response.data; // Assuming axios returns data on success
          },
          (_progress) => {
            // Progress tracking removed - not used in current implementation
          },
          (attempt, error) => {
            setRetryInfo({
              attempt,
              maxAttempts: throttleRef.current['config'].maxRetries,
              error,
              delay: throttleRef.current['config'].retryDelay * Math.pow(throttleRef.current['config'].backoffMultiplier, attempt - 1),
            });
            
            toast.warning(`Retrying upload for ${fileWithProgress.sanitizedName} (attempt ${attempt}/${throttleRef.current['config'].maxRetries})`);
          }
        );
        
        // Add the file to completed files and remove from active files
        setCompletedFiles((prevCompleted) => [...prevCompleted, { ...fileWithProgress, uploaded: true }]);
        setFiles((prevFiles) =>
          prevFiles.filter((file) => file.id !== fileWithProgress.id)
        );
        
        toast.success(`Successfully uploaded ${fileWithProgress.sanitizedName}`);
      } catch (error) {
        console.error('Upload error:', error);
        toast.error(`Upload failed for ${fileWithProgress.sanitizedName}`);
      }
    });
    
    try {
      await Promise.all(uploadPromises);
      toast.success('All files uploaded successfully!');
    } catch (error) {
      console.error('Upload batch error:', error);
      toast.error('Some files failed to upload');
    } finally {
      setUploading(false);
    }
  }

  function removeFile(id: string) {
    setFiles((prevFiles) => prevFiles.filter((file) => file.id !== id));
  }

  function handleClear() {
    setFiles([]);
    setValidationErrors([]);
    setValidationWarnings([]);
  }

  // Remove completed files after 3 seconds
  useEffect(() => {
    if (completedFiles.length > 0) {
      const timer = setTimeout(() => {
        setCompletedFiles([]);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [completedFiles]);

  // Calculate total size for display
  const totalSize = files.reduce((sum, file) => sum + file.file.size, 0);
  const totalSizeFormatted = totalSize > 0 ? `(${formatFileSize(totalSize)})` : '';

  function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  }

  return (
    <>
      <Toaster position="top-right" richColors />
      
      {/* Throttle Status Display */}
      {(uploadStatus.activeUploads > 0 || uploadStatus.queueLength > 0) && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="bg-blue-50 border border-blue-200 rounded-lg p-3"
        >
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-blue-600" />
              <span className="text-blue-800">
                Upload Queue: {uploadStatus.activeUploads} active, {uploadStatus.queueLength} queued
              </span>
            </div>
            <div className="text-blue-600">
              Max: {uploadStatus.maxConcurrent}
            </div>
          </div>
        </motion.div>
      )}

      {/* Retry Status Display */}
      {retryInfo && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="bg-yellow-50 border border-yellow-200 rounded-lg p-3"
        >
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-2">
              <RefreshCw className="h-4 w-4 text-yellow-600 animate-spin" />
              <span className="text-yellow-800">
                Retrying upload (attempt {retryInfo.attempt}/{retryInfo.maxAttempts})
              </span>
            </div>
            <div className="text-yellow-600">
              Delay: {Math.round(retryInfo.delay / 1000)}s
            </div>
          </div>
        </motion.div>
      )}

      {/* Security Status */}
      {(validationErrors.length > 0 || validationWarnings.length > 0) && (
        <div className="mb-4 p-4 rounded-lg border">
          {validationErrors.length > 0 && (
            <div className="mb-2">
              <h4 className="font-semibold text-red-600 mb-2">Security Errors:</h4>
              <ul className="text-sm text-red-600 space-y-1">
                {validationErrors.map((error, index) => (
                  <li key={index} className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>{error}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {validationWarnings.length > 0 && (
            <div>
              <h4 className="font-semibold text-yellow-600 mb-2">Security Warnings:</h4>
              <ul className="text-sm text-yellow-600 space-y-1">
                {validationWarnings.map((warning, index) => (
                  <li key={index} className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>{warning}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div
        className={`relative border-2 border-dashed rounded-xl p-12 flex flex-col items-center justify-center transition-all duration-200 ease-in-out min-h-[200px] ${
          dragActive 
            ? 'border-blue-500 bg-blue-500/10 scale-[1.02] shadow-lg shadow-blue-500/20' 
            : 'border-gray-300 bg-transparent hover:border-gray-400 hover:bg-gray-50/50'
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        tabIndex={0}
        aria-label="File dropzone"
      >
        <input
          type="file"
          ref={inputRef}
          onChange={handleFileSelect}
          multiple
          className="hidden"
          id="file-upload"
          disabled={uploading}
          accept={Object.keys(SECURITY_CONFIG.ALLOWED_TYPES).join(',')}
        />
        
        {/* Upload Icon */}
        <div className={`mb-6 transition-all duration-200 ${
          dragActive ? 'scale-110 text-blue-600' : 'text-gray-500'
        }`}>
          <svg
            className="w-16 h-16"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
        </div>

        {/* Instructions */}
        <div className="text-center space-y-2">
          <p className={`text-lg font-medium transition-colors ${
            dragActive ? 'text-blue-600' : 'text-gray-700'
          }`}>
            {dragActive ? 'Drop files here' : 'Drag & drop files here'}
          </p>
          <p className="text-sm text-gray-600">
            or{' '}
            <label 
              htmlFor="file-upload" 
              className="underline cursor-pointer text-blue-600 hover:text-blue-700 transition-colors"
            >
              browse files
            </label>
          </p>
          <p className="text-xs text-gray-500 mt-2">
            Supports: Images, Documents, Videos, Audio
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Max: {SECURITY_CONFIG.MAX_FILES} files, {formatFileSize(SECURITY_CONFIG.MAX_FILE_SIZE)} per file
          </p>
        </div>

        {/* Browse Button */}
        <Button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="mt-6 rounded-full text-xl font-semibold"
        >
          Choose Files
        </Button>
      </div>
      
      <div className="flex gap-4 mt-8">
        <Button
          onClick={handleUpload}
          disabled={files.length === 0 || uploading || validationErrors.length > 0}
          className="flex-1 rounded-full text-xl font-semibold"
        >
          Upload Files {totalSizeFormatted}
        </Button>
        <AnimatePresence>
          {files.length > 0 && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: "auto", opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="overflow-hidden"
            >
              <Button
                onClick={handleClear}
                disabled={uploading}
                className="rounded-full text-xl font-semibold whitespace-nowrap"
              >
                Clear All
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      {uploading && (
        <div className="mt-4">
          <Progress value={
            files.length
              ? files.reduce((acc, f) => acc + f.progress, 0) / files.length
              : 0
          } />
        </div>
      )}
      
      <div className="mt-6">
        <FileList files={files} onRemove={removeFile} uploading={uploading} />
        <AnimatePresence>
          {completedFiles.map((file) => (
            <motion.div
              key={file.id}
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="mt-2"
            >
              <CompletedFileItem file={file} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </>
  );
} 