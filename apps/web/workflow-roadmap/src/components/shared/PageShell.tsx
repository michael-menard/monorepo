import { Link } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import type { ReactNode } from 'react'

function LoadingSkeleton({ variant }: { variant: 'plan' | 'story' }) {
  if (variant === 'story') {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="animate-pulse space-y-6">
          <div className="h-5 bg-slate-800 rounded w-32" />
          <div className="space-y-3">
            <div className="h-4 bg-slate-800 rounded w-24" />
            <div className="h-8 bg-slate-800 rounded w-2/3" />
            <div className="flex gap-2">
              <div className="h-5 bg-slate-800 rounded-full w-20" />
              <div className="h-5 bg-slate-800 rounded-full w-16" />
            </div>
          </div>
          <div className="h-16 bg-slate-900/50 border border-slate-700/50 rounded-xl" />
          <div className="grid grid-cols-3 gap-6">
            <div className="col-span-2 space-y-4">
              <div className="h-40 bg-slate-900/50 border border-slate-700/50 rounded-xl" />
              <div className="h-24 bg-slate-900/50 border border-slate-700/50 rounded-xl" />
            </div>
            <div className="h-64 bg-slate-900/50 border border-slate-700/50 rounded-xl" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="animate-pulse space-y-4">
        <div className="h-6 bg-slate-800 rounded w-32"></div>
        <div className="h-8 bg-slate-800 rounded w-1/3"></div>
        <div className="h-4 bg-slate-800 rounded w-1/4"></div>
        <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-6 space-y-3">
          <div className="h-4 bg-slate-800 rounded"></div>
          <div className="h-4 bg-slate-800 rounded"></div>
          <div className="h-4 bg-slate-800 rounded w-5/6"></div>
        </div>
      </div>
    </div>
  )
}

export function PageShell({
  isLoading,
  error,
  data,
  variant,
  backTo,
  backLabel,
  containerClass,
  children,
}: {
  isLoading: boolean
  error: unknown
  data: unknown
  variant: 'plan' | 'story'
  backTo: string
  backLabel: string
  containerClass?: string
  children: ReactNode
}) {
  if (isLoading) {
    return <LoadingSkeleton variant={variant} />
  }

  const errorMessage = error
    ? 'error' in (error as Record<string, unknown>)
      ? String((error as Record<string, unknown>).error)
      : `Failed to fetch ${variant}`
    : null

  if (errorMessage) {
    return (
      <div className={containerClass ?? 'container mx-auto px-4 py-8'}>
        <Link
          to={backTo}
          className="inline-flex items-center text-sm text-slate-400 hover:text-cyan-400 mb-6 transition-colors"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {backLabel}
        </Link>
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg font-mono text-sm">
          ERROR: {errorMessage}
        </div>
      </div>
    )
  }

  if (!data) {
    return null
  }

  return <>{children}</>
}
