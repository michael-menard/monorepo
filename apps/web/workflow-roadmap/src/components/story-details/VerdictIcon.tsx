import { CheckCircle2, XCircle, AlertTriangle, RefreshCw } from 'lucide-react'

export function VerdictIcon({ verdict }: { verdict: string }) {
  if (verdict === 'pass') return <CheckCircle2 className="h-4 w-4 text-emerald-400" />
  if (verdict === 'fail') return <XCircle className="h-4 w-4 text-red-400" />
  if (verdict === 'blocked') return <AlertTriangle className="h-4 w-4 text-amber-400" />
  return <RefreshCw className="h-4 w-4 text-slate-400" />
}
