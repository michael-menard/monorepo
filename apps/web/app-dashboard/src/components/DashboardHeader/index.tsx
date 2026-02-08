/**
 * Dashboard Header Component
 * Page header with title, description, and theme toggle
 */

interface DashboardHeaderProps {
  title?: string
  description?: string
}

export function DashboardHeader({
  title = 'Dashboard',
  description = 'Your LEGO MOC collection at a glance',
}: DashboardHeaderProps) {
  return (
    <div className="space-y-1">
      <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{title}</h1>
      <p className="text-sm md:text-base text-muted-foreground">{description}</p>
    </div>
  )
}
