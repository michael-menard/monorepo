import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useDropzone, FileRejection } from 'react-dropzone';
import Cropper from 'react-easy-crop';
import { Dialog, DialogContent, DialogTitle } from '../dialog';
import { Button } from '../button';
import imageCompression from 'browser-image-compression';
import { useTranslation } from 'react-i18next';

interface ImageUploadModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { file: File; title: string; description: string; extra?: Record<string, any> }) => void;
  isLoading?: boolean;
  onUploadProgress?: (progress: number) => void;
  renderExtraFields?: (extra: Record<string, any>, setExtra: (v: Record<string, any>) => void) => React.ReactNode;
  theme?: 'light' | 'dark';
}

const ACCEPTED_FORMATS = ['image/jpeg', 'image/png', 'image/heic'];
const MAX_SIZE = 20 * 1024 * 1024; // 20MB

const ImageUploadModal: React.FC<ImageUploadModalProps> = ({
  open,
  onClose,
  onSubmit,
  isLoading = false,
  onUploadProgress,
  renderExtraFields,
  theme = 'light',
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [progress, setProgress] = useState<number>(0);
  const [cropping, setCropping] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { t } = useTranslation();
  const [extra, setExtra] = useState<Record<string, any>>({});
  const [isUploading, setIsUploading] = useState(false);

  // Clipboard paste support
  useEffect(() => {
    if (!open) return;
    const handlePaste = (e: ClipboardEvent) => {
      if (e.clipboardData) {
        const items = e.clipboardData.items;
        for (let i = 0; i < items.length; i++) {
          if (items[i].type.startsWith('image/')) {
            const file = items[i].getAsFile();
            if (file) {
              setFile(file);
              setFileUrl(URL.createObjectURL(file));
              setCropping(true);
              break;
            }
          }
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [open]);

  // Touch optimizations (scroll lock, etc.)
  useEffect(() => {
    if (!open) return;
    const preventScroll = (e: TouchEvent) => {
      if (e.target && (e.target as HTMLElement).closest('.modal-content')) return;
      e.preventDefault();
    };
    document.body.style.overflow = open ? 'hidden' : '';
    window.addEventListener('touchmove', preventScroll, { passive: false });
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('touchmove', preventScroll);
    };
  }, [open]);

  // Dropzone logic
  const onDrop = useCallback((acceptedFiles: File[], fileRejections: FileRejection[]) => {
    setError(null);
    let reason: { code: string } | undefined;
    if (fileRejections.length > 0) {
      const first = fileRejections[0];
      const errors = first?.errors;
      if (Array.isArray(errors) && errors.length > 0 && errors[0] && typeof errors[0].code === 'string') {
        reason = errors[0];
      }
    }
    if (reason) {
      if (reason.code === 'file-too-large') setError(t('File is too large (max 20MB)'));
      else if (reason.code === 'file-invalid-type') setError(t('Invalid file type'));
      else setError(t('File not accepted'));
      return;
    }
    if (acceptedFiles.length > 0 && acceptedFiles[0]) {
      const f = acceptedFiles[0];
      setFile(f);
      setFileUrl(URL.createObjectURL(f));
      setCropping(true);
    }
  }, [t]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_FORMATS.reduce((acc, type) => ({ ...acc, [type]: [] }), {}),
    maxSize: MAX_SIZE,
    multiple: false,
    disabled: isLoading,
  });

  // Cropping logic
  const onCropComplete = useCallback((_: any, croppedPixels: any) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  async function getCroppedImg(imageSrc: string, cropPixels: any): Promise<Blob | null> {
    return new Promise((resolve) => {
      const image = new window.Image();
      image.src = imageSrc;
      image.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = cropPixels.width;
        canvas.height = cropPixels.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(null);
        ctx.drawImage(
          image,
          cropPixels.x,
          cropPixels.y,
          cropPixels.width,
          cropPixels.height,
          0,
          0,
          cropPixels.width,
          cropPixels.height
        );
        canvas.toBlob((blob) => resolve(blob), (file && file.type) ? file.type : 'image/jpeg');
      };
      image.onerror = () => resolve(null);
    });
  }

  const handleCropSave = async () => {
    if (fileUrl && croppedAreaPixels) {
      const croppedBlob = await getCroppedImg(fileUrl, croppedAreaPixels);
      if (croppedBlob) {
        const croppedFile = new File([croppedBlob], file?.name || 'cropped.jpg', { type: file?.type || 'image/jpeg' });
        setFile(croppedFile);
        setFileUrl(URL.createObjectURL(croppedFile));
        setCropping(false);
      } else {
        setError('Failed to crop image');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!file) {
      setError(t('Please select an image file.'));
      return;
    }
    if (!title.trim()) {
      setError(t('Title is required.'));
      return;
    }
    setIsUploading(true);
    setProgress(0);
    // Compress/resize image before upload
    let uploadFile = file;
    try {
      uploadFile = await imageCompression(file, { maxSizeMB: 2, maxWidthOrHeight: 1920, useWebWorker: true });
    } catch (err) {
      setError(t('Failed to compress image.'));
      setIsUploading(false);
      return;
    }
    // Simulate upload progress or use onUploadProgress
    if (onUploadProgress) {
      onUploadProgress(0);
    }
    let prog = 0;
    const interval = setInterval(() => {
      prog += 10;
      setProgress(prog);
      if (onUploadProgress) onUploadProgress(prog);
      if (prog >= 100) {
        clearInterval(interval);
        setIsUploading(false);
        onSubmit({ file: uploadFile, title, description, extra });
        setProgress(0);
      }
    }, 50);
  };

  const handleClose = () => {
    setFile(null);
    setFileUrl(null);
    setTitle('');
    setDescription('');
    setError(null);
    setProgress(0);
    setCropping(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose} aria-modal="true">
      <DialogTitle>{t('Upload Image')}</DialogTitle>
      <DialogContent className={`modal-content ${theme === 'dark' ? 'dark' : ''}`}>
        <form onSubmit={handleSubmit}>
          {/* Drag-and-drop area */}
          {!fileUrl && (
            <div
              {...getRootProps()}
              ref={dropRef}
              aria-label="Image file drop area"
              tabIndex={0}
              style={{
                border: isDragActive ? '2px solid #2563eb' : '2px dashed #94a3b8',
                background: isDragActive ? '#dbeafe' : '#f1f5f9',
                borderRadius: 8,
                padding: 32,
                textAlign: 'center',
                outline: 'none',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                marginBottom: 24,
                transition: 'border 0.2s, background 0.2s',
              }}
            >
              <input {...getInputProps()} aria-label="Select image file" />
              <div style={{ fontSize: 48, color: isDragActive ? '#2563eb' : '#64748b' }}>📤</div>
              <div style={{ fontWeight: 600, fontSize: 18, margin: '12px 0' }}>
                {isDragActive ? 'Drop your image here...' : 'Drag & drop or click to select an image'}
              </div>
              <div style={{ color: '#64748b', fontSize: 14 }}>
                (JPG, PNG, HEIC, max 20MB)
              </div>
            </div>
          )}

          {/* Cropping UI */}
          {fileUrl && cropping && (
            <div style={{ marginBottom: 24 }}>
              <div style={{ position: 'relative', width: '100%', height: 300, background: '#000', borderRadius: 8 }}>
                <Cropper
                  image={fileUrl}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={onCropComplete}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12 }}>
                <Button type="button" onClick={() => setCropping(false)} variant="outline">
                  Cancel
                </Button>
                <Button type="button" onClick={handleCropSave} variant="default">
                  Save Crop
                </Button>
              </div>
            </div>
          )}

          {/* Image preview */}
          {fileUrl && !cropping && (
            <div style={{ marginBottom: 24, textAlign: 'center' }}>
              <img
                src={fileUrl}
                alt="Preview"
                style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 8, margin: '0 auto' }}
              />
            </div>
          )}

          {/* Metadata fields */}
          {fileUrl && !cropping && (
            <>
              <label htmlFor="title" style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>
                Title
              </label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                required
                style={{ width: '100%', padding: 8, marginBottom: 12, borderRadius: 4, border: '1px solid #cbd5e1' }}
                aria-label="Image title"
              />
              <label htmlFor="description" style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>
                Description
              </label>
              <textarea
                id="description"
                value={description}
                onChange={e => setDescription(e.target.value)}
                style={{ width: '100%', padding: 8, marginBottom: 12, borderRadius: 4, border: '1px solid #cbd5e1' }}
                aria-label="Image description"
              />
            </>
          )}

          {/* Extra metadata fields injected by parent */}
          {renderExtraFields && renderExtraFields(extra, setExtra)}

          {/* Error message */}
          {error && (
            <div role="alert" style={{ color: '#dc2626', marginBottom: 12 }}>
              {error}
            </div>
          )}

          {/* Progress bar or spinner */}
          {(progress > 0 || isUploading) && (
            <div style={{ marginBottom: 12 }}>
              {isUploading && progress === 0 ? (
                <div className="spinner" aria-label={t('Uploading...')} />
              ) : (
                <div style={{ height: 6, background: '#e5e7eb', borderRadius: 3 }}>
                  <div
                    style={{
                      width: `${progress}%`,
                      height: 6,
                      background: '#2563eb',
                      borderRadius: 3,
                      transition: 'width 0.2s',
                    }}
                  />
                </div>
              )}
            </div>
          )}

          {/* Action buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button type="button" onClick={handleClose} variant="outline" disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" variant="default" disabled={isLoading || cropping || !file}>
              {isLoading ? 'Uploading...' : 'Upload'}
            </Button>
          </div>
        </form>
        {/* Storybook: Add stories for all states (idle, drag, cropping, uploading, error) */}
      </DialogContent>
    </Dialog>
  );
};

export default ImageUploadModal; 