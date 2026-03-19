import { AppBadge } from '../badges/AppBadge'
import { cn } from '../_lib/utils'
import {
  getStoryStateColor,
  getPriorityColor,
  getPlanStatusColor,
  getGenericTagColor,
} from './color-maps'
import type {
  StateTagProps,
  PriorityTagProps,
  PlanStatusTagProps,
  GenericTagProps,
  EpicTagProps,
  WorkflowTagProps,
} from './__types__'

export function StateTag({ state, size, className }: StateTagProps) {
  return (
    <AppBadge
      variant="outline"
      size={size}
      className={cn(getStoryStateColor(state, 'badge'), className)}
    >
      {state.replace(/_/g, ' ')}
    </AppBadge>
  )
}

export function PriorityTag({ priority, size, className }: PriorityTagProps) {
  return (
    <AppBadge
      variant="outline"
      size={size}
      className={cn(getPriorityColor(priority, 'badge'), className)}
    >
      {priority}
    </AppBadge>
  )
}

export function PlanStatusTag({ status, size, className }: PlanStatusTagProps) {
  return (
    <AppBadge variant="outline" size={size} className={cn(getPlanStatusColor(status), className)}>
      {status}
    </AppBadge>
  )
}

export function GenericTag({ label, size: _size, className }: GenericTagProps) {
  return (
    <span
      className={cn(
        'text-[10px] font-mono px-1.5 py-0.5 rounded border inline-flex items-center',
        getGenericTagColor(label),
        className,
      )}
    >
      {label}
    </span>
  )
}

export function EpicTag({ label, size, className }: EpicTagProps) {
  return (
    <AppBadge
      variant="outline"
      size={size}
      className={cn('!border-slate-500/40 !text-slate-300/70 font-mono', className)}
    >
      {label}
    </AppBadge>
  )
}

export function WorkflowTag({ category, value, size, className }: WorkflowTagProps) {
  switch (category) {
    case 'state':
      return <StateTag state={value} size={size} className={className} />
    case 'priority':
      return <PriorityTag priority={value} size={size} className={className} />
    case 'planStatus':
      return <PlanStatusTag status={value} size={size} className={className} />
    case 'generic':
      return <GenericTag label={value} size={size} className={className} />
    case 'epic':
      return <EpicTag label={value} size={size} className={className} />
  }
}
