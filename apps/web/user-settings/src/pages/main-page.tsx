/**
 * User Profile Main Page
 *
 * Profile overview with avatar, stats, and activity feed.
 */
import { useState } from 'react'
import {
  useGetUserProfileQuery,
  useUpdateUserProfileMutation,
  usePresignAvatarUploadMutation,
  useGetUserActivityQuery,
} from '@repo/api-client'
import { Skeleton } from '@repo/app-component-library'
import { ProfileHeader } from '../components/ProfileHeader'
import { ProfileStats } from '../components/ProfileStats'
import { ProfileActivity } from '../components/ProfileActivity'

export function MainPage() {
  const [activityPage, setActivityPage] = useState(1)
  const { data: profile, isLoading: profileLoading } = useGetUserProfileQuery()
  const { data: activity, isLoading: activityLoading } = useGetUserActivityQuery({
    page: activityPage,
    limit: 10,
  })
  const [updateProfile, { isLoading: isUpdating }] = useUpdateUserProfileMutation()
  const [presignAvatar] = usePresignAvatarUploadMutation()

  const handleUpdateProfile = (data: { displayName?: string; bio?: string }) => {
    updateProfile(data)
  }

  const handleAvatarUpload = async (file: File) => {
    const contentType = file.type as 'image/jpeg' | 'image/png' | 'image/webp'
    const result = await presignAvatar({ filename: file.name, contentType }).unwrap()

    // Upload file directly to MinIO/S3 via presigned URL
    await fetch(result.uploadUrl, {
      method: 'PUT',
      body: file,
      headers: { 'Content-Type': contentType },
    })
  }

  if (profileLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-48 w-full rounded-lg" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        Unable to load profile
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <ProfileHeader
        profile={profile}
        onUpdateProfile={handleUpdateProfile}
        onAvatarUpload={handleAvatarUpload}
        isUpdating={isUpdating}
      />

      <ProfileStats profile={profile} />

      <ProfileActivity
        activities={activity?.items ?? []}
        isLoading={activityLoading}
        total={activity?.total}
        onLoadMore={
          activity && activity.total > activity.items.length
            ? () => setActivityPage(p => p + 1)
            : undefined
        }
      />
    </div>
  )
}

export default MainPage
