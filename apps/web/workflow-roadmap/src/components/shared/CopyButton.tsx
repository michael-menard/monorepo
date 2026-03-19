import { Copy, CheckCheck } from 'lucide-react'
import { useState } from 'react'

export function CopyButton({ text, className }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      }}
      className={
        className ??
        'opacity-0 group-hover/sid:opacity-100 transition-opacity text-cyan-500/50 hover:text-cyan-400 cursor-pointer'
      }
      aria-label={`Copy ${text} to clipboard`}
    >
      {copied ? <CheckCheck className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  )
}
