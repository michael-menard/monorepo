import React, { useState, useRef } from 'react';
import { Avatar, AvatarImage, AvatarFallback, Button } from '@repo/ui';
import { CropModal } from './CropModal';
import { cn } from '../lib/utils';
import type { AvatarUploaderProps } from '../types/index';

export const AvatarUploader: React.FC<AvatarUploaderProps> = ({
  currentAvatarUrl,
  onUpload,
  className,
  disabled = false,
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [showCropModal, setShowCropModal] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/heic'];
    if (!validTypes.includes(file.type)) {
      alert('Only .jpg and .heic files are supported');
      return;
    }

    // Validate file size (20MB max)
    const maxSize = 20 * 1024 * 1024; // 20MB
    if (file.size > maxSize) {
      alert('File size must be less than 20MB');
      return;
    }

    // Create URL for preview
    const imageUrl = URL.createObjectURL(file);
    setSelectedImageUrl(imageUrl);
    setShowCropModal(true);
  };

  const handleCropComplete = async (croppedImage: File) => {
    try {
      setIsUploading(true);
      const avatarUrl = await onUpload(croppedImage);
      // The parent component should handle updating the avatar URL
    } catch (error) {
      console.error('Failed to upload avatar:', error);
      alert('Failed to upload avatar. Please try again.');
    } finally {
      setIsUploading(false);
      setShowCropModal(false);
      setSelectedImageUrl('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveAvatar = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    // Note: This would need to be handled by the parent component
    // to actually remove the avatar from the backend
  };

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className={cn('flex flex-col items-center space-y-4', className)}>
      <div className="relative">
        <Avatar className="h-24 w-24">
          <AvatarImage 
            src={currentAvatarUrl} 
            alt="Profile avatar"
            className="object-cover"
          />
          <AvatarFallback className="text-lg font-semibold">
            {getInitials()}
          </AvatarFallback>
        </Avatar>
        
        {isUploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
            <div className="text-white text-sm">Uploading...</div>
          </div>
        )}
      </div>

      <div className="flex space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isUploading}
        >
          {currentAvatarUrl ? 'Change Avatar' : 'Upload Avatar'}
        </Button>
        
        {currentAvatarUrl && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleRemoveAvatar}
            disabled={disabled || isUploading}
          >
            Remove
          </Button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".jpg,.jpeg,.heic"
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled || isUploading}
      />

      <CropModal
        isOpen={showCropModal}
        onClose={() => {
          setShowCropModal(false);
          setSelectedImageUrl('');
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        }}
        imageUrl={selectedImageUrl}
        onCropComplete={handleCropComplete}
        aspectRatio={1}
      />
    </div>
  );
}; 