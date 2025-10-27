import React from 'react'
import { Card, CardContent, cn } from '@repo/ui'

export interface ProfileLayoutProps {
  /** Content for the left sidebar - typically profile information */
  sidebarContent: React.ReactNode
  /** Main content area - dynamic per app */
  children: React.ReactNode
  /** Additional CSS classes for the container */
  className?: string
  /** Additional CSS classes for the sidebar */
  sidebarClassName?: string
  /** Additional CSS classes for the main content area */
  contentClassName?: string
  /** Width of the sidebar - defaults to 'wide' */
  sidebarWidth?: 'normal' | 'wide' | 'extra-wide'
  /** Offset from the left edge of the browser */
  leftOffset?: 'none' | 'small' | 'medium' | 'large'
  /** Whether the sidebar should be sticky */
  stickysidebar?: boolean
  /** Custom sidebar background */
  sidebarBackground?: 'default' | 'muted' | 'accent' | 'transparent'
}

/**
 * ProfileLayout - Shared layout component for profile pages
 *
 * Features:
 * - Wide left vertical sidebar with offset from browser edge
 * - Large round avatar at top of sidebar
 * - Profile data below avatar
 * - Dynamic right content area customizable per app
 * - Responsive design with mobile support
 * - Sticky sidebar option
 * - Customizable spacing and styling
 */
export const ProfileLayout: React.FC<ProfileLayoutProps> = ({
  sidebarContent,
  children,
  className = '',
  sidebarClassName = '',
  contentClassName = '',
  sidebarWidth = 'wide',
  leftOffset = 'medium',
  stickysidebar = true,
  sidebarBackground = 'default',
}) => {
  // Sidebar width classes
  const sidebarWidthClasses = {
    normal: 'w-80', // 320px
    wide: 'w-96', // 384px
    'extra-wide': 'w-[28rem]', // 448px
  }

  // Left offset classes
  const leftOffsetClasses = {
    none: 'ml-0',
    small: 'ml-4', // 16px
    medium: 'ml-8', // 32px
    large: 'ml-16', // 64px
  }

  // Sidebar background classes
  const sidebarBackgroundClasses = {
    default: 'bg-background',
    muted: 'bg-muted/50',
    accent: 'bg-accent/10',
    transparent: 'bg-transparent',
  }

  return (
    <div
      className={cn(
        'w-full min-h-screen',
        'bg-gradient-to-br from-background via-muted/20 to-accent/10',
        className,
      )}
    >
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          {/* Left Sidebar - Wide vertical bar with offset */}
          <aside
            className={cn(
              // Base sidebar styling
              'flex-shrink-0',
              sidebarWidthClasses[sidebarWidth],
              leftOffsetClasses[leftOffset],
              // Responsive behavior
              'w-full lg:w-auto',
              // Sticky positioning
              stickysidebar && 'lg:sticky lg:top-8',
              // Custom classes
              sidebarClassName,
            )}
          >
            <Card
              className={cn(
                'w-full shadow-lg border-0',
                sidebarBackgroundClasses[sidebarBackground],
                // Enhanced styling
                'backdrop-blur-sm',
                'ring-1 ring-border/50',
              )}
            >
              <CardContent className="p-8">
                {/* Profile Avatar Section - Large round avatar at top */}
                <div className="flex flex-col items-center mb-8">{sidebarContent}</div>
              </CardContent>
            </Card>
          </aside>

          {/* Main Content Area - Dynamic space custom per app */}
          <main
            className={cn(
              'flex-1 min-w-0', // min-w-0 prevents flex item from overflowing
              'w-full',
              contentClassName,
            )}
          >
            <Card className="w-full min-h-[600px] shadow-lg border-0 bg-background/95 backdrop-blur-sm ring-1 ring-border/50">
              <CardContent className="p-8">{children}</CardContent>
            </Card>
          </main>
        </div>
      </div>
    </div>
  )
}

/**
 * ProfileLayoutSidebar - Helper component for sidebar content structure
 * Provides consistent structure for avatar and profile data
 */
export interface ProfileLayoutSidebarProps {
  /** Large round avatar component */
  avatar: React.ReactNode
  /** Profile information below avatar */
  profileInfo: React.ReactNode
  /** Additional content below profile info */
  additionalContent?: React.ReactNode
  /** Custom styling for avatar section */
  avatarClassName?: string
  /** Custom styling for profile info section */
  profileInfoClassName?: string
}

export const ProfileLayoutSidebar: React.FC<ProfileLayoutSidebarProps> = ({
  avatar,
  profileInfo,
  additionalContent,
  avatarClassName = '',
  profileInfoClassName = '',
}) => {
  return (
    <div className="w-full space-y-6">
      {/* Large Round Avatar Section */}
      <div className={cn('flex flex-col items-center', avatarClassName)}>{avatar}</div>

      {/* Profile Data Section */}
      <div className={cn('w-full space-y-4', 'text-center lg:text-left', profileInfoClassName)}>
        {profileInfo}
      </div>

      {/* Additional Content */}
      {additionalContent ? (
        <div className="w-full pt-4 border-t border-gray-200/50">{additionalContent}</div>
      ) : null}
    </div>
  )
}

export default ProfileLayout
