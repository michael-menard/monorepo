import { StatsCards } from '@repo/app-component-library'
import type { StatItem } from '@repo/app-component-library'
import { Blocks, Heart, Palette, Calendar } from 'lucide-react'
import type { UserProfile } from '../../__types__'

interface ProfileStatsProps {
  profile: UserProfile
  isLoading?: boolean
}

export function ProfileStats({ profile, isLoading }: ProfileStatsProps) {
  const memberDays = Math.floor(
    (Date.now() - new Date(profile.memberSince).getTime()) / (1000 * 60 * 60 * 24),
  )

  const items: StatItem[] = [
    {
      icon: Blocks,
      label: 'MOCs',
      value: (profile.preferences?.totalMocs as number) ?? 0,
      colorClass: 'text-lego-red',
      bgClass: 'bg-lego-red/10',
    },
    {
      icon: Heart,
      label: 'Wishlist',
      value: (profile.preferences?.wishlistCount as number) ?? 0,
      colorClass: 'text-lego-blue',
      bgClass: 'bg-lego-blue/10',
    },
    {
      icon: Palette,
      label: 'Themes',
      value: (profile.preferences?.themeCount as number) ?? 0,
      colorClass: 'text-lego-yellow',
      bgClass: 'bg-lego-yellow/10',
    },
    {
      icon: Calendar,
      label: 'Days Active',
      value: memberDays,
      colorClass: 'text-emerald-600 dark:text-emerald-400',
      bgClass: 'bg-emerald-600/10 dark:bg-emerald-400/10',
    },
  ]

  return (
    <StatsCards
      items={items}
      isLoading={isLoading}
      emptyTitle="No stats yet"
      emptyDescription="Start adding MOCs and sets to see your stats!"
      ariaLabel="Profile statistics"
    />
  )
}
