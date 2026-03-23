import { AppBadge } from '@repo/app-component-library'
import type { ServiceStatus } from '../../store/__types__'

const statusVariantMap: Record<ServiceStatus, 'success' | 'destructive' | 'warning'> = {
  healthy: 'success',
  unhealthy: 'destructive',
  unknown: 'warning',
}

export function StatusBadge({ status }: { status: ServiceStatus }) {
  return <AppBadge variant={statusVariantMap[status]}>{status}</AppBadge>
}
