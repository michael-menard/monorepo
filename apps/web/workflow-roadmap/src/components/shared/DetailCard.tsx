import type { ReactNode } from 'react'

export function DetailCard({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`bg-slate-900/50 border border-slate-700/50 backdrop-blur-sm rounded-xl p-6${className ? ` ${className}` : ''}`}
    >
      {children}
    </div>
  )
}
