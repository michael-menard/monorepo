import React from 'react';
import { Avatar, AvatarFallback, AvatarImage, Badge } from '@repo/ui';
import { AvatarUploader } from '@repo/profile';
import { Pencil } from 'lucide-react';
import { cn } from '@repo/ui/lib/utils';

export interface EnhancedProfileAvatarProps {
  /** Avatar image URL */
  avatarUrl?: string;
  /** User's full name for fallback initials */
  userName: string;
  /** User's email */
  userEmail: string;
  /** Size of the avatar */
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  /** Whether the avatar is editable */
  editable?: boolean;
  /** Callback for avatar upload */
  onAvatarUpload?: (file: File) => void;
  /** Callback for avatar removal */
  onAvatarRemove?: () => void;
  /** Whether upload is in progress */
  isLoading?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Whether to show online status */
  showStatus?: boolean;
  /** Online status */
  isOnline?: boolean;
  /** Whether to show verification badge */
  showVerified?: boolean;
  /** Whether user is verified */
  isVerified?: boolean;
  /** Max file size in bytes */
  maxFileSize?: number;
  /** Accepted file types */
  acceptedFileTypes?: string[];
  /** Whether to show the upload/remove buttons below avatar */
  showActionButtons?: boolean;
}

/**
 * EnhancedProfileAvatar - Advanced avatar component with full upload functionality
 * 
 * Features:
 * - Integrates with existing AvatarUploader for advanced features
 * - Hover overlay with pencil icon for upload
 * - Image cropping and processing
 * - File validation and error handling
 * - Progress indicators
 * - Online status and verification badges
 * - Configurable sizes and styling
 */
export const EnhancedProfileAvatar: React.FC<EnhancedProfileAvatarProps> = ({
  avatarUrl,
  userName,
  userEmail,
  size = 'xl',
  editable = false,
  onAvatarUpload,
  onAvatarRemove,
  isLoading = false,
  className = '',
  showStatus = false,
  isOnline = false,
  showVerified = false,
  isVerified = false,
  maxFileSize = 5 * 1024 * 1024, // 5MB
  acceptedFileTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'],
  showActionButtons = false,
}) => {
  // Size classes for avatar
  const sizeClasses = {
    sm: 'h-12 w-12',
    md: 'h-16 w-16', 
    lg: 'h-24 w-24',
    xl: 'h-32 w-32',
    '2xl': 'h-40 w-40',
  };

  // Size classes for status indicator
  const statusSizes = {
    sm: 'h-3 w-3',
    md: 'h-3.5 w-3.5',
    lg: 'h-4 w-4',
    xl: 'h-5 w-5',
    '2xl': 'h-6 w-6',
  };

  // Generate initials from name
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // If editable and has upload functionality, use enhanced version
  if (editable && onAvatarUpload) {
    return (
      <div className={cn('flex flex-col items-center space-y-4', className)}>
        {/* Use AvatarUploader for full functionality but customize the display */}
        <div className="relative">
          <AvatarUploader
            currentAvatar={avatarUrl}
            onUpload={onAvatarUpload}
            onRemove={onAvatarRemove}
            isLoading={isLoading}
            maxFileSize={maxFileSize}
            acceptedFileTypes={acceptedFileTypes}
            cropAspectRatio={1}
            cropShape="round"
            className="flex flex-col items-center space-y-0"
          />
          
          {/* Custom overlay for our design */}
          <div className="absolute inset-0 top-0">
            <div className="relative group">
              <Avatar className={cn(
                sizeClasses[size],
                'ring-4 ring-background shadow-xl',
                'transition-all duration-300',
                'hover:ring-primary/50 cursor-pointer',
              )}>
                <AvatarImage 
                  src={avatarUrl} 
                  alt={`${userName}'s avatar`}
                  className="object-cover"
                />
                <AvatarFallback className={cn(
                  'bg-gradient-to-br from-primary to-secondary',
                  'text-primary-foreground font-bold',
                  size === 'sm' && 'text-xs',
                  size === 'md' && 'text-sm', 
                  size === 'lg' && 'text-lg',
                  size === 'xl' && 'text-xl',
                  size === '2xl' && 'text-2xl',
                )}>
                  {getInitials(userName)}
                </AvatarFallback>
              </Avatar>

              {/* Hover Overlay with Pencil Icon */}
              <div className={cn(
                'absolute inset-0 flex items-center justify-center',
                'bg-black/50 opacity-0 group-hover:opacity-100',
                'transition-opacity duration-200',
                'rounded-full cursor-pointer',
              )}>
                <Pencil className={cn(
                  'text-white',
                  size === 'sm' && 'h-3 w-3',
                  size === 'md' && 'h-4 w-4',
                  size === 'lg' && 'h-5 w-5',
                  size === 'xl' && 'h-6 w-6',
                  size === '2xl' && 'h-7 w-7',
                )} />
              </div>

              {/* Online Status Indicator */}
              {showStatus && (
                <div className={cn(
                  'absolute bottom-1 right-1',
                  'rounded-full border-2 border-background',
                  statusSizes[size],
                  isOnline ? 'bg-green-500' : 'bg-gray-400',
                )} />
              )}

              {/* Verification Badge */}
              {showVerified && isVerified && (
                <div className="absolute -top-1 -right-1">
                  <Badge 
                    variant="default" 
                    className="h-6 w-6 rounded-full p-0 flex items-center justify-center bg-blue-500 hover:bg-blue-600"
                  >
                    <svg className="h-3 w-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </Badge>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Hide the default AvatarUploader buttons if we don't want them */}
        {!showActionButtons && (
          <style jsx>{`
            .avatar-uploader-buttons {
              display: none !important;
            }
          `}</style>
        )}
      </div>
    );
  }

  // Fallback to simple avatar for non-editable or no upload handler
  return (
    <div className={cn('relative inline-block', className)}>
      <div className="relative">
        <Avatar className={cn(
          sizeClasses[size],
          'ring-4 ring-background shadow-xl',
          'transition-all duration-300',
        )}>
          <AvatarImage 
            src={avatarUrl} 
            alt={`${userName}'s avatar`}
            className="object-cover"
          />
          <AvatarFallback className={cn(
            'bg-gradient-to-br from-primary to-secondary',
            'text-primary-foreground font-bold',
            size === 'sm' && 'text-xs',
            size === 'md' && 'text-sm', 
            size === 'lg' && 'text-lg',
            size === 'xl' && 'text-xl',
            size === '2xl' && 'text-2xl',
          )}>
            {getInitials(userName)}
          </AvatarFallback>
        </Avatar>

        {/* Online Status Indicator */}
        {showStatus && (
          <div className={cn(
            'absolute bottom-1 right-1',
            'rounded-full border-2 border-background',
            statusSizes[size],
            isOnline ? 'bg-green-500' : 'bg-gray-400',
          )} />
        )}

        {/* Verification Badge */}
        {showVerified && isVerified && (
          <div className="absolute -top-1 -right-1">
            <Badge 
              variant="default" 
              className="h-6 w-6 rounded-full p-0 flex items-center justify-center bg-blue-500 hover:bg-blue-600"
            >
              <svg className="h-3 w-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </Badge>
          </div>
        )}
      </div>
    </div>
  );
};

export default EnhancedProfileAvatar;
