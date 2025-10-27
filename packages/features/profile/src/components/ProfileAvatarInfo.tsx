import React from 'react'
import { Badge, cn } from '@repo/ui'
import { MapPin, Calendar, User } from 'lucide-react'

export interface ProfileAvatarInfoProps {
  /** User's full name */
  userName: string
  /** User's email */
  userEmail: string
  /** User's username */
  username?: string
  /** User's title/job */
  title?: string
  /** User's location */
  location?: string
  /** Date user joined */
  joinDate?: Date
  /** Array of badges to display */
  badges?: Array<{
    label: string
    variant: 'default' | 'secondary' | 'destructive' | 'outline'
  }>
  /** Additional CSS classes */
  className?: string
}

/**
 * ProfileAvatarInfo - Displays user information below the avatar
 *
 * Shows user details like name, email, title, location, join date, and badges
 */
export const ProfileAvatarInfo: React.FC<ProfileAvatarInfoProps> = ({
  userName,
  userEmail,
  username,
  title,
  location,
  joinDate,
  badges = [],
  className,
}) => {
  const formatJoinDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
    })
  }

  return (
    <div className={cn('space-y-3 text-center', className)}>
      {/* Name and Title */}
      <div className="space-y-1">
        <h2 className="text-xl font-bold text-foreground">{userName}</h2>
        {title ? <p className="text-sm text-muted-foreground font-medium">{title}</p> : null}
      </div>

      {/* Username and Email */}
      <div className="space-y-1">
        {username ? (
          <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground">
            <User className="h-3 w-3" />
            <span>@{username}</span>
          </div>
        ) : null}
        <p className="text-xs text-muted-foreground">{userEmail}</p>
      </div>

      {/* Location */}
      {location ? (
        <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground">
          <MapPin className="h-3 w-3" />
          <span>{location}</span>
        </div>
      ) : null}

      {/* Join Date */}
      {joinDate ? (
        <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground">
          <Calendar className="h-3 w-3" />
          <span>Joined {formatJoinDate(joinDate)}</span>
        </div>
      ) : null}

      {/* Badges */}
      {badges.length > 0 && (
        <div className="flex flex-wrap justify-center gap-1">
          {badges.map((badge, index) => (
            <Badge key={index} variant={badge.variant} className="text-xs">
              {badge.label}
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}

export default ProfileAvatarInfo
