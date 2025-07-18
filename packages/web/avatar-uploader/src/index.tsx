// AvatarUploader React component
// Reusable avatar upload UI for monorepo apps
// Usage: import AvatarUploader from '@monorepo/avatar-uploader'
// See README.md for details
import React, { useRef, useState } from 'react';

export interface AvatarUploaderProps {
  userId: string;
  baseUrl: string; // Base URL for the API endpoint
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

const ACCEPTED_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/heic',
];
const MAX_SIZE_MB = 20;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

const AvatarUploader: React.FC<AvatarUploaderProps> = ({ userId, baseUrl, onSuccess, onError }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const inputRef = useRef<HTMLInputElement>(null);
  let progressInterval: ReturnType<typeof setInterval> | null = null;

  const reset = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setError(null);
    setProgress(0);
    if (inputRef.current) inputRef.current.value = '';
  };

  const validateFile = (file: File): string | null => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return 'Invalid file type. Please select a JPEG, JPG, HEIC, or PNG image.';
    }
    if (file.size > MAX_SIZE_BYTES) {
      return `File is too large. Max size is ${MAX_SIZE_MB}MB.`;
    }
    return null;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      setSelectedFile(null);
      setPreviewUrl(null);
      if (inputRef.current) inputRef.current.value = '';
      return;
    }
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setError(null);
  };

  const handleRemove = () => {
    reset();
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);
    setError(null);
    setProgress(0);
    
    // Simulate progress (since we can't get real progress without backend support)
    progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval!);
          return prev;
        }
        return prev + 10;
      });
    }, 200);

    try {
      const formData = new FormData();
      formData.append('avatar', selectedFile);

      const response = await fetch(`${baseUrl}/api/users/${userId}/avatar`, {
        method: 'POST',
        body: formData,
        credentials: 'include', // Include cookies for authentication
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
      }

      setProgress(100);
      if (onSuccess) onSuccess();
      setTimeout(() => {
        reset();
        setUploading(false);
      }, 500);
    } catch (err: any) {
      setError(err.message || 'Upload failed. Please try again.');
      if (onError) onError(err);
      setUploading(false);
      setProgress(0);
    } finally {
      if (progressInterval) clearInterval(progressInterval);
    }
  };

  return (
    <div style={{ maxWidth: 320, margin: '0 auto', textAlign: 'center' }}>
      <input
        type="file"
        accept={ACCEPTED_TYPES.join(',')}
        ref={inputRef}
        style={{ display: 'none' }}
        onChange={handleFileChange}
        aria-label="Choose avatar image"
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        style={{ marginBottom: 12 }}
        aria-label="Choose avatar"
      >
        Choose Avatar
      </button>
      {previewUrl && (
        <div style={{ margin: '12px 0' }}>
          <img
            src={previewUrl}
            alt="Avatar Preview"
            style={{ width: 120, height: 120, borderRadius: '50%', objectFit: 'cover', border: '1px solid #ccc' }}
          />
          <div>
            <button
              type="button"
              onClick={handleRemove}
              disabled={uploading}
              aria-label="Remove selected image"
              style={{ marginTop: 8 }}
            >
              Remove
            </button>
          </div>
        </div>
      )}
      {error && (
        <div style={{ color: 'red', marginBottom: 8 }} role="alert">
          {error}
        </div>
      )}
      {uploading && (
        <div style={{ marginBottom: 8 }}>
          <progress value={progress} max={100} aria-label="Upload progress" style={{ width: '100%' }} />
          <div>{progress}%</div>
        </div>
      )}
      <div>
        <button
          type="button"
          onClick={handleUpload}
          disabled={!selectedFile || uploading}
          aria-label="Upload avatar"
        >
          {uploading ? 'Uploading...' : 'Upload'}
        </button>
      </div>
    </div>
  );
};

export default AvatarUploader; 