import React, { useState, useRef } from 'react';
import type { ChangeEvent } from 'react';
import { Edit, User, LogOut, Upload } from 'lucide-react';
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
  ConfirmationDialog,
  cn,
} from './index';

// Zod schema for component props
const AppAvatarSchema = z.object({
  avatarUrl: z.string().optional(),
  userName: z.string().optional(),
  userEmail: z.string().optional(),
  onAvatarUpload: z.function().args(z.instanceof(File)).returns(z.promise(z.void())).optional(),
  onProfileClick: z.function().returns(z.void()).optional(),
  onLogout: z.function().returns(z.void()).optional(),
  className: z.string().optional(),
  size: z.enum(['sm', 'md', 'lg']).default('md'),
  showEditButton: z.boolean().default(true),
  disabled: z.boolean().default(false),
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
  className,
  size = 'md',
  showEditButton = true,
  disabled = false,
}) => {
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const config = sizeConfig[size];
  const initials = getInitials(userName, userEmail);

  const handleFileSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);

    // Basic file validation
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB');
      return;
    }

    setSelectedFile(file);
    setIsUploadModalOpen(true);
  };

  const handleAvatarUpload = async () => {
    if (!onAvatarUpload || !selectedFile) return;

    setIsUploading(true);
    setError(null);

    try {
      await onAvatarUpload(selectedFile);
      setIsUploadModalOpen(false);
      setSelectedFile(null);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Upload failed');
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

  const handleModalClose = () => {
    if (!isUploading) {
      setIsUploadModalOpen(false);
      setSelectedFile(null);
      setError(null);
    }
  };

  return (
    <div className={cn('relative inline-block', className)}>
      {/* Avatar with Dropdown */}
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

      {/* Edit Button Overlay */}
      {showEditButton && onAvatarUpload && (
        <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity duration-200 rounded-full bg-black/20">
          <Button
            variant="secondary"
            size="icon"
            className={cn(
              'bg-white/90 hover:bg-white text-gray-700 hover:text-gray-900 shadow-md',
              config.editButton,
            )}
            onClick={() => fileInputRef.current?.click()}
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
          <div className="py-4 space-y-4">
            {selectedFile && (
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">Selected: {selectedFile.name}</p>
                <div className="w-24 h-24 mx-auto rounded-full overflow-hidden bg-muted">
                  <img
                    src={URL.createObjectURL(selectedFile)}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            )}

            {error && <div className="text-sm text-red-600 bg-red-50 p-2 rounded-md">{error}</div>}

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={handleModalClose} disabled={isUploading}>
                Cancel
              </Button>
              <Button
                onClick={handleAvatarUpload}
                disabled={!selectedFile || isUploading}
                className="flex items-center space-x-2"
              >
                {isUploading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    <span>Uploading...</span>
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    <span>Upload</span>
                  </>
                )}
              </Button>
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