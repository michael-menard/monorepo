import { MessageSquare } from 'lucide-react'

export function EmptyChat() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4">
      <MessageSquare className="mb-4 h-12 w-12 text-slate-600" />
      <h2 className="mb-2 text-lg font-semibold text-slate-300">No conversation selected</h2>
      <p className="text-sm text-slate-500">
        Start typing below or click &quot;New Chat&quot; to begin.
      </p>
    </div>
  )
}
