import React from 'react';
import { Avatar, AvatarFallback, AvatarImage, Badge, Button } from '@repo/ui';
import { AvatarUploader } from './AvatarUploader';
import { Camera, Edit, User, Pencil } from 'lucide-react';
import { cn } from '@repo/ui';

export interface ProfileAvatarProps {
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
  /** Callback for edit button click */
  onEdit?: () => void;
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
}

/**
 * ProfileAvatar - Large round avatar component for profile layouts
 * 
 * Features:
 * - Multiple sizes from small to 2xl
 * - Upload functionality with camera icon
 * - Online status indicator
 * - Verification badge
 * - Fallback initials
 * - Hover effects and animations
 */
export const ProfileAvatar: React.FC<ProfileAvatarProps> = ({
  avatarUrl,
  userName,
  userEmail,
  size = 'xl',
  editable = false,
  onAvatarUpload,
  onEdit,
  className = '',
  showStatus = false,
  isOnline = false,
  showVerified = false,
  isVerified = false,
}) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Size classes for avatar
  const sizeClasses = {
    sm: 'h-12 w-12',
    md: 'h-16 w-16', 
    lg: 'h-24 w-24',
    xl: 'h-32 w-32',
    '2xl': 'h-40 w-40',
  };

  // Size classes for edit button
  const editButtonSizes = {
    sm: 'h-6 w-6',
    md: 'h-7 w-7',
    lg: 'h-8 w-8', 
    xl: 'h-10 w-10',
    '2xl': 'h-12 w-12',
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

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && onAvatarUpload) {
      onAvatarUpload(file);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  // If editable and has upload handler, use AvatarUploader with custom styling
  if (editable && onAvatarUpload) {
    return (
      <div className="relative inline-block">
        <div className={cn('relative group', className)}>
          <Avatar
            data-testid="avatar"
            className={cn(
              sizeClasses[size],
              'ring-4 ring-background shadow-xl',
              'transition-all duration-300',
              'hover:ring-primary/50 cursor-pointer',
            )}>
            <AvatarImage
              data-testid="avatar-image"
              src={avatarUrl}
              alt={`${userName}'s avatar`}
              className="object-cover"
            />
            <AvatarFallback
              data-testid="avatar-fallback"
              className={cn(
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
          )}
          onClick={handleUploadClick}
          >
            <Pencil
              data-testid="pencil-icon"
              className={cn(
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
            <div
              data-testid="status-indicator"
              className={cn(
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

        {/* Hidden File Input */}
        <input
          data-testid="file-input"
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileUpload}
          className="hidden"
        />
      </div>
    );
  }

  // Non-editable avatar or no upload handler
  return (
    <div className="relative inline-block">
      {/* Main Avatar */}
      <div className={cn('relative', className)}>
        <Avatar
          data-testid="avatar"
          className={cn(
            sizeClasses[size],
            'ring-4 ring-background shadow-xl',
            'transition-all duration-300',
          )}>
          <AvatarImage
            data-testid="avatar-image"
            src={avatarUrl}
            alt={`${userName}'s avatar`}
            className="object-cover"
          />
          <AvatarFallback
            data-testid="avatar-fallback"
            className={cn(
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
          <div
            data-testid="status-indicator"
            className={cn(
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

        {/* Edit Button for non-upload editable avatars */}
        {editable && onEdit && !onAvatarUpload && (
          <Button
            size="sm"
            variant="secondary"
            className={cn(
              'absolute -bottom-2 -right-2',
              'rounded-full shadow-lg',
              'hover:scale-110 transition-transform',
              editButtonSizes[size],
              'p-0 flex items-center justify-center',
            )}
            onClick={onEdit}
          >
            <Edit className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
};

/**
 * ProfileAvatarInfo - Component for displaying user info below avatar
 */
export interface ProfileAvatarInfoProps {
  /** User's full name */
  userName: string;
  /** User's email */
  userEmail: string;
  /** User's username/handle */
  username?: string;
  /** User's title or role */
  title?: string;
  /** User's location */
  location?: string;
  /** Join date */
  joinDate?: Date;
  /** Additional badges */
  badges?: Array<{
    label: string;
    variant?: 'default' | 'secondary' | 'destructive' | 'outline';
    color?: string;
  }>;
  /** Custom styling */
  className?: string;
}

export const ProfileAvatarInfo: React.FC<ProfileAvatarInfoProps> = ({
  userName,
  userEmail,
  username,
  title,
  location,
  joinDate,
  badges = [],
  className = '',
}) => {
  const formatJoinDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
    });
  };

  return (
    <div className={cn('space-y-3 text-center', className)}>
      {/* Name */}
      <div>
        <h2 className="text-xl font-bold text-foreground">{userName}</h2>
        {username && (
          <p className="text-sm text-muted-foreground">@{username}</p>
        )}
      </div>

      {/* Title */}
      {title && (
        <p className="text-sm font-medium text-primary">{title}</p>
      )}

      {/* Email */}
      <p className="text-sm text-muted-foreground break-all">{userEmail}</p>

      {/* Location */}
      {location && (
        <p className="text-sm text-muted-foreground flex items-center justify-center gap-1">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          {location}
        </p>
      )}

      {/* Join Date */}
      {joinDate && (
        <p className="text-xs text-muted-foreground">
          Joined {formatJoinDate(joinDate)}
        </p>
      )}

      {/* Badges */}
      {badges.length > 0 && (
        <div className="flex flex-wrap gap-2 justify-center">
          {badges.map((badge, index) => (
            <Badge 
              key={index}
              variant={badge.variant || 'secondary'}
              className={badge.color ? `bg-${badge.color}` : ''}
            >
              {badge.label}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProfileAvatar;
