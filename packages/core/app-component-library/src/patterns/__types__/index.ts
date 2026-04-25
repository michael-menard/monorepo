import { z } from 'zod'

// =============================================================================
// StatCards
// =============================================================================

export const StatCardItemSchema = z.object({
  value: z.string(),
  label: z.string(),
  icon: z.custom<React.ComponentType<{ className?: string }>>().optional(),
  change: z.string().optional(),
  trend: z.enum(['up', 'down']).optional(),
})

export type StatCardItem = z.infer<typeof StatCardItemSchema>

export const StatCardsPropsSchema = z.object({
  items: z.array(StatCardItemSchema),
  variant: z.enum(['basic', 'trend']).optional(),
  columns: z.number().optional(),
})

export type StatCardsProps = z.infer<typeof StatCardsPropsSchema>

// =============================================================================
// ActivityList
// =============================================================================

export const ActivityListItemSchema = z.object({
  action: z.string(),
  item: z.string(),
  time: z.string(),
  img: z.string().nullable().optional(),
  user: z.string().optional(),
  avatar: z.string().optional(),
})

export type ActivityListItem = z.infer<typeof ActivityListItemSchema>

export const TimelineGroupSchema = z.object({
  date: z.string(),
  items: z.array(ActivityListItemSchema),
})

export type TimelineGroup = z.infer<typeof TimelineGroupSchema>

export const ActivityListImagePropsSchema = z.object({
  items: z.array(ActivityListItemSchema),
  variant: z.enum(['image', 'avatar']),
  title: z.string().optional(),
})

export const ActivityListTimelinePropsSchema = z.object({
  groups: z.array(TimelineGroupSchema),
  variant: z.literal('timeline'),
})

export type ActivityListImageProps = z.infer<typeof ActivityListImagePropsSchema>
export type ActivityListTimelineProps = z.infer<typeof ActivityListTimelinePropsSchema>
export type ActivityListProps = ActivityListImageProps | ActivityListTimelineProps

// =============================================================================
// GaugeChart
// =============================================================================

export const GaugeChartPropsSchema = z.object({
  value: z.number().min(0).max(100),
  label: z.string(),
  color: z.string().optional(),
  size: z.enum(['sm', 'md', 'lg']).optional(),
  status: z.string().optional(),
})

export type GaugeChartProps = z.infer<typeof GaugeChartPropsSchema>

// =============================================================================
// DashboardLayout
// =============================================================================

export const DashboardLayoutPropsSchema = z.object({
  stats: z.array(StatCardItemSchema),
  activity: z.array(ActivityListItemSchema),
  activityTitle: z.string().optional(),
  children: z.custom<React.ReactNode>(),
})

export type DashboardLayoutProps = z.infer<typeof DashboardLayoutPropsSchema>
