import { useState, useCallback } from 'react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Badge,
} from '@repo/app-component-library'
import { logger } from '@repo/logger'
import { useUpdateMocMutation } from '@repo/api-client/rtk/instructions-api'
import type { BuildStatus } from '@repo/api-client/schemas/instructions'

const BUILD_STATUS_CONFIG: Record<BuildStatus, { label: string; className: string }> = {
  instructions_added: {
    label: 'Instructions Added',
    className: 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-300',
  },
  acquiring_parts: {
    label: 'Acquiring Parts',
    className: 'bg-amber-100 text-amber-700 hover:bg-amber-200 border-amber-300',
  },
  ready_to_build: {
    label: 'Ready to Build',
    className: 'bg-sky-100 text-sky-700 hover:bg-sky-200 border-sky-300',
  },
  building: {
    label: 'Building',
    className: 'bg-teal-100 text-teal-700 hover:bg-teal-200 border-teal-300',
  },
  complete: {
    label: 'Complete',
    className: 'bg-green-100 text-green-700 hover:bg-green-200 border-green-300',
  },
  parted_out: {
    label: 'Parted Out',
    className: 'bg-purple-100 text-purple-700 hover:bg-purple-200 border-purple-300',
  },
}

const ALL_STATUSES: BuildStatus[] = [
  'instructions_added',
  'acquiring_parts',
  'ready_to_build',
  'building',
  'complete',
  'parted_out',
]

interface BuildStatusBadgeProps {
  mocId: string
  buildStatus: BuildStatus
  onStatusChange?: (newStatus: BuildStatus) => void
}

export function BuildStatusBadge({ mocId, buildStatus, onStatusChange }: BuildStatusBadgeProps) {
  const [optimisticStatus, setOptimisticStatus] = useState(buildStatus)
  const [updateMoc] = useUpdateMocMutation()

  const config = BUILD_STATUS_CONFIG[optimisticStatus]

  const handleSelect = useCallback(
    async (newStatus: BuildStatus) => {
      if (newStatus === optimisticStatus) return

      const previousStatus = optimisticStatus
      setOptimisticStatus(newStatus)

      try {
        await updateMoc({ id: mocId, input: { buildStatus: newStatus } }).unwrap()
        onStatusChange?.(newStatus)
      } catch (err) {
        logger.error('Failed to update build status', err)
        setOptimisticStatus(previousStatus)
      }
    },
    [mocId, optimisticStatus, updateMoc, onStatusChange],
  )

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" aria-label={`Build status: ${config.label}. Click to change.`}>
          <Badge
            variant="outline"
            className={`cursor-pointer text-xs font-medium border px-2.5 py-0.5 transition-colors ${config.className}`}
          >
            {config.label}
          </Badge>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {ALL_STATUSES.map(status => {
          const statusConfig = BUILD_STATUS_CONFIG[status]
          return (
            <DropdownMenuItem
              key={status}
              onSelect={() => handleSelect(status)}
              className={optimisticStatus === status ? 'font-semibold' : ''}
            >
              <Badge variant="outline" className={`text-xs border ${statusConfig.className} mr-2`}>
                {statusConfig.label}
              </Badge>
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export { BUILD_STATUS_CONFIG, ALL_STATUSES }
