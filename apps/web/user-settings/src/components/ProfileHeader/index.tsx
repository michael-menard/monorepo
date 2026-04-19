import { useState } from 'react'
import { Edit, Calendar } from 'lucide-react'
import {
  AppAvatar,
  Card,
  CardContent,
  CustomButton,
  AppInput,
  AppTextarea,
  AppLabel,
} from '@repo/app-component-library'
import { formatDistanceToNow } from 'date-fns'
import type { UserProfile } from '../../__types__'

interface ProfileHeaderProps {
  profile: UserProfile
  onUpdateProfile: (data: { displayName?: string; bio?: string }) => void
  onAvatarUpload: (file: File) => Promise<void>
  isUpdating?: boolean
}

export function ProfileHeader({
  profile,
  onUpdateProfile,
  onAvatarUpload,
  isUpdating,
}: ProfileHeaderProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [displayName, setDisplayName] = useState(profile.displayName ?? '')
  const [bio, setBio] = useState(profile.bio ?? '')

  const handleSave = () => {
    onUpdateProfile({ displayName: displayName || undefined, bio: bio || undefined })
    setIsEditing(false)
  }

  const handleCancel = () => {
    setDisplayName(profile.displayName ?? '')
    setBio(profile.bio ?? '')
    setIsEditing(false)
  }

  return (
    <Card className="bg-card border-border">
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex-shrink-0">
            <AppAvatar
              avatarUrl={profile.avatarUrl ?? undefined}
              userName={profile.displayName ?? 'User'}
              size="lg"
              showEditButton
              onAvatarUpload={onAvatarUpload}
              clickable={false}
            />
          </div>

          <div className="flex-1 min-w-0">
            {isEditing ? (
              <div className="space-y-4">
                <div>
                  <AppLabel htmlFor="displayName">Display Name</AppLabel>
                  <AppInput
                    id="displayName"
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    placeholder="Enter your display name"
                    maxLength={100}
                  />
                </div>
                <div>
                  <AppLabel htmlFor="bio">Bio</AppLabel>
                  <AppTextarea
                    id="bio"
                    value={bio}
                    onChange={e => setBio(e.target.value)}
                    placeholder="Tell us about yourself"
                    maxLength={500}
                    rows={3}
                  />
                </div>
                <div className="flex gap-2">
                  <CustomButton onClick={handleSave} disabled={isUpdating}>
                    {isUpdating ? 'Saving...' : 'Save'}
                  </CustomButton>
                  <CustomButton variant="outline" onClick={handleCancel}>
                    Cancel
                  </CustomButton>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-2xl font-bold text-card-foreground">
                    {profile.displayName || 'Set up your profile'}
                  </h1>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-card-foreground transition-colors"
                    aria-label="Edit profile"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                </div>

                {profile.bio && (
                  <p className="text-muted-foreground mb-3 max-w-lg">{profile.bio}</p>
                )}

                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>Member for {formatDistanceToNow(new Date(profile.memberSince))}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
