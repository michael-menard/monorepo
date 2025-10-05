import React, { useState, useRef } from 'react';
import type { ChangeEvent } from 'react';
import { Edit, User, LogOut, Settings, Upload, X } from 'lucide-react';
import { z } from 'zod';

// Global types for DOM elements
declare global {
  interface Window {
    URL: {
      createObjectURL: (file: File) => string;
    };
  }
}

import {
  Avatar,
  AvatarImage,
  AvatarFallback,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  cn,
} from './index';

import { ConfirmationDialog } from './ConfirmationDialog';

// Zod schema for component props
const AppAvatarSchema = z.object({
  avatarUrl: z.string().optional(),
  userName: z.string().optional(),
  userEmail: z.string().optional(),
  onAvatarUpload: z.function().args(z.instanceof(File)).returns(z.promise(z.void())).optional(),
  onProfileClick: z.function().returns(z.void()).optional(),
  onLogout: z.function().returns(z.void()).optional(),
  onUserSettingsClick: z.function().returns(z.void()).optional(),
  className: z.string().optional(),
  size: z.enum(['sm', 'md', 'lg']).default('md'),
  showEditButton: z.boolean().default(true),
  disabled: z.boolean().default(false),
  clickable: z.boolean().default(true),
});

type AppAvatarProps = z.infer<typeof AppAvatarSchema>;

// Size configurations
const sizeConfig = {
  sm: {
    avatar: 'h-8 w-8',
    editButton: 'h-6 w-6',
    icon: 'h-3 w-3',
    text: 'text-xs',
  },
  md: {
    avatar: 'h-10 w-10',
    editButton: 'h-8 w-8',
    icon: 'h-4 w-4',
    text: 'text-sm',
  },
  lg: {
    avatar: 'h-12 w-12',
    editButton: 'h-10 w-10',
    icon: 'h-5 w-5',
    text: 'text-base',
  },
};

// Helper function to get user initials
const getInitials = (name?: string, email?: string): string => {
  if (name) {
    return name
      .split(' ')
      .map((word) => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }
  if (email) {
    return email.charAt(0).toUpperCase();
  }
  return 'U';
};

export const AppAvatar: React.FC<AppAvatarProps> = ({
  avatarUrl,
  userName,
  userEmail,
  onAvatarUpload,
  onProfileClick,
  onLogout,
  onUserSettingsClick,
  className,
  size = 'md',
  showEditButton = true,
  disabled = false,
  clickable = true,
}) => {
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const config = sizeConfig[size];
  const initials = getInitials(userName, userEmail);

  const handleFileSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      return;
    }

    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setIsUploadModalOpen(true);
  };

  const handleAvatarUpload = async () => {
    if (!selectedFile || !onAvatarUpload) return;

    setIsUploading(true);

    try {
      await onAvatarUpload(selectedFile);
      setIsUploadModalOpen(false);
      setSelectedFile(null);
      setPreviewUrl(null);
    } catch (error) {
      console.error('Avatar upload failed:', error);
      alert('Failed to upload avatar. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    }
    setIsLogoutDialogOpen(false);
  };

  const handleProfileClick = () => {
    if (onProfileClick) {
      onProfileClick();
    }
  };

  const handleUserSettingsClick = () => {
    if (onUserSettingsClick) {
      onUserSettingsClick();
    }
  };

  const handleModalClose = () => {
    if (!isUploading) {
      setIsUploadModalOpen(false);
      setSelectedFile(null);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
    }
  };

  const handleFileInputClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={cn('relative inline-block', className)}>
      {/* Avatar with Dropdown */}
      {clickable ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className={cn(
                'relative p-0 h-auto w-auto rounded-full hover:bg-transparent',
                config.avatar,
              )}
              disabled={disabled}
            >
              <Avatar className={cn('cursor-pointer', config.avatar)}>
                <AvatarImage src={avatarUrl} alt={`${userName || 'User'}'s avatar`} />
                <AvatarFallback className={cn('font-semibold', config.text)}>
                  {initials}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={handleProfileClick}>
              <User className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleUserSettingsClick}>
              <Settings className="mr-2 h-4 w-4" />
              User Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => setIsLogoutDialogOpen(true)}
              disabled={!onLogout}
              className="text-destructive focus:text-destructive"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        /* Non-clickable Avatar */
        <div className={cn('relative', config.avatar)}>
          <Avatar className={config.avatar}>
            <AvatarImage src={avatarUrl} alt={`${userName || 'User'}'s avatar`} />
            <AvatarFallback className={cn('font-semibold', config.text)}>
              {initials}
            </AvatarFallback>
          </Avatar>
        </div>
      )}

      {/* Edit Button Overlay */}
      {showEditButton && onAvatarUpload && (
        <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity duration-200 rounded-full bg-black/20 pointer-events-none">
          <Button
            variant="secondary"
            size="icon"
            className={cn(
              'bg-white/90 hover:bg-white text-gray-700 hover:text-gray-900 shadow-md pointer-events-auto',
              config.editButton,
            )}
            onClick={handleFileInputClick}
            disabled={disabled || isUploading}
          >
            <Edit className={config.icon} />
          </Button>
        </div>
      )}

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Avatar Upload Modal */}
      <Dialog open={isUploadModalOpen} onOpenChange={handleModalClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Update Profile Picture</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="text-center space-y-4">
              {/* Preview */}
              <div className="flex justify-center">
                <div className="relative">
                  <Avatar className="w-24 h-24">
                    <AvatarImage src={previewUrl || avatarUrl} alt="Preview" />
                    <AvatarFallback className="text-lg font-semibold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </div>
              </div>

              {/* File Info */}
              {selectedFile && (
                <div className="text-sm text-gray-600">
                  <p>Selected: {selectedFile.name}</p>
                  <p>Size: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              )}

              {/* Upload Button */}
              <div className="flex justify-center gap-2">
                <Button
                  onClick={handleFileInputClick}
                  variant="outline"
                  disabled={isUploading}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Choose Different Image
                </Button>
                <Button
                  onClick={handleAvatarUpload}
                  disabled={!selectedFile || isUploading}
                >
                  {isUploading ? 'Uploading...' : 'Upload'}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Logout Confirmation Dialog */}
      <ConfirmationDialog
        title="Confirm Logout"
        description="Are you sure you want to logout? You will need to sign in again to access your account."
        confirmText="Logout"
        cancelText="Cancel"
        variant="destructive"
        open={isLogoutDialogOpen}
        onOpenChange={setIsLogoutDialogOpen}
        onConfirm={handleLogout}
      />
    </div>
  );
};

AppAvatar.displayName = 'AppAvatar'; 