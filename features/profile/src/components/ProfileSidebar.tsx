import React, { useState } from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@repo/ui';
import { AvatarUploader } from './AvatarUploader';
import { cn } from '../lib/utils';
import type { ProfileSidebarProps } from '../types/index';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

const profileSchema = z.object({
  displayName: z.string().min(2, 'Display name must be at least 2 characters').max(32, 'Display name must be at most 32 characters'),
});
type ProfileFormValues = z.infer<typeof profileSchema>;

export const ProfileSidebar: React.FC<ProfileSidebarProps> = ({
  profile,
  onAvatarUpload,
  isEditable = false,
  className,
  onProfileUpdate,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: profile.displayName || '',
    },
    mode: 'onBlur',
  });

  const getInitials = (name?: string) => {
    if (!name) return profile.username.slice(0, 2).toUpperCase();
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleEdit = () => {
    reset({
      displayName: profile.displayName || '',
    });
    setIsEditing(true);
    setError(null);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setError(null);
    reset({
      displayName: profile.displayName || '',
    });
  };

  const onSubmit = async (data: ProfileFormValues) => {
    if (!onProfileUpdate) return;
    setLoading(true);
    setError(null);
    try {
      await onProfileUpdate({ displayName: data.displayName });
      setIsEditing(false);
    } catch (e: any) {
      setError(e?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={cn('flex flex-col space-y-6', className)}>
      {/* Avatar Section */}
      <div className="flex flex-col items-center">
        {isEditable && onAvatarUpload ? (
          <AvatarUploader
            currentAvatarUrl={profile.avatarUrl}
            onUpload={onAvatarUpload}
            className="w-full"
          />
        ) : (
          <Avatar className="h-24 w-24">
            <AvatarImage 
              src={profile.avatarUrl} 
              alt={`${profile.displayName || profile.username}'s avatar`}
              className="object-cover"
            />
            <AvatarFallback className="text-lg font-semibold">
              {getInitials(profile.displayName)}
            </AvatarFallback>
          </Avatar>
        )}
      </div>

      {/* User Info Section */}
      <div className="text-center space-y-2">
        {isEditing ? (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-2">
            <div>
              <input
                className={cn(
                  'w-full border rounded px-2 py-1 text-lg font-bold text-gray-900',
                  errors.displayName && 'border-red-500'
                )}
                {...register('displayName')}
                placeholder="Display Name"
                disabled={loading}
                aria-invalid={!!errors.displayName}
              />
              {errors.displayName && (
                <div className="text-red-500 text-xs mt-1">{errors.displayName.message}</div>
              )}
            </div>
            <div className="flex justify-center gap-2 mt-2">
              <button
                type="submit"
                className="px-3 py-1 rounded bg-blue-600 text-white text-sm font-medium disabled:opacity-50"
                disabled={loading || !isDirty}
              >
                {loading ? 'Saving...' : 'Save'}
              </button>
              <button
                type="button"
                className="px-3 py-1 rounded bg-gray-200 text-gray-700 text-sm font-medium"
                onClick={handleCancel}
                disabled={loading}
              >
                Cancel
              </button>
            </div>
            {error && <div className="text-red-500 text-xs mt-1">{error}</div>}
          </form>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-gray-900">
              {profile.displayName || profile.username}
            </h1>
            {profile.displayName && (
              <p className="text-gray-500 text-sm">
                @{profile.username}
              </p>
            )}
            {isEditable && onProfileUpdate && (
              <button
                className="mt-2 px-3 py-1 rounded bg-gray-100 text-gray-700 text-sm font-medium border border-gray-300 hover:bg-gray-200"
                onClick={handleEdit}
              >
                Edit
              </button>
            )}
          </>
        )}
      </div>

      {/* Stats Section */}
      {profile.stats && (
        <div className="flex justify-center space-x-8 pt-4 border-t border-gray-200">
          {profile.stats.projects !== undefined && (
            <div className="text-center">
              <div className="text-xl font-bold text-gray-900">
                {profile.stats.projects}
              </div>
              <div className="text-xs text-gray-500">
                {profile.stats.projects === 1 ? 'Project' : 'Projects'}
              </div>
            </div>
          )}
          {profile.stats.followers !== undefined && (
            <div className="text-center">
              <div className="text-xl font-bold text-gray-900">
                {profile.stats.followers}
              </div>
              <div className="text-xs text-gray-500">
                {profile.stats.followers === 1 ? 'Follower' : 'Followers'}
              </div>
            </div>
          )}
          {profile.stats.following !== undefined && (
            <div className="text-center">
              <div className="text-xl font-bold text-gray-900">
                {profile.stats.following}
              </div>
              <div className="text-xs text-gray-500">
                Following
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}; 