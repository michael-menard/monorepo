import { useEffect, useMemo, useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { Button, ConfirmationDialog, cn } from '@repo/app-component-library'
import { Plus, Trash2 } from 'lucide-react'
import {
  chatActions,
  selectConversations,
  selectActiveConversationId,
  fetchConversations,
  createConversationAsync,
  deleteConversationAsync,
  loadConversation,
} from '../../store/chatSlice'

function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export function ChatSidebar() {
  const dispatch = useDispatch()
  const conversations = useSelector(selectConversations)
  const activeId = useSelector(selectActiveConversationId)
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)

  // Load conversations from API on mount
  useEffect(() => {
    ;(dispatch as any)(fetchConversations())
  }, [dispatch])

  const sorted = useMemo(
    () => Object.values(conversations).sort((a, b) => b.updatedAt - a.updatedAt),
    [conversations],
  )

  const handleNewChat = () => {
    ;(dispatch as any)(createConversationAsync())
  }

  const handleSelect = (id: string) => {
    dispatch(chatActions.setActiveConversation(id))
    const convo = conversations[id]
    if (convo && !convo.messagesLoaded) {
      ;(dispatch as any)(loadConversation(id))
    }
  }

  const handleDelete = () => {
    if (deleteTargetId) {
      ;(dispatch as any)(deleteConversationAsync(deleteTargetId))
      setDeleteTargetId(null)
    }
  }

  return (
    <div className="flex w-[260px] flex-col border-r border-slate-700/50 bg-slate-950/50">
      <div className="p-3">
        <Button onClick={handleNewChat} variant="outline" className="w-full gap-2" size="sm">
          <Plus className="h-4 w-4" />
          New Chat
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {sorted.map(convo => (
          <button
            key={convo.id}
            onClick={() => handleSelect(convo.id)}
            className={cn(
              'group flex w-full items-center gap-2 border-l-2 px-3 py-2 text-left text-sm transition-colors hover:bg-slate-800/50',
              convo.id === activeId
                ? 'border-cyan-500 bg-slate-800/30 text-slate-100'
                : 'border-transparent text-slate-400',
            )}
          >
            <div className="min-w-0 flex-1">
              <div className="truncate">{convo.title}</div>
              <div className="text-xs text-slate-600">{formatRelativeTime(convo.updatedAt)}</div>
            </div>
            <button
              onClick={e => {
                e.stopPropagation()
                setDeleteTargetId(convo.id)
              }}
              className="shrink-0 rounded p-1 opacity-0 transition-opacity hover:bg-slate-700 group-hover:opacity-100"
              aria-label={`Delete ${convo.title}`}
            >
              <Trash2 className="h-3.5 w-3.5 text-slate-500" />
            </button>
          </button>
        ))}
      </div>

      <ConfirmationDialog
        title="Delete conversation"
        description="This conversation will be permanently deleted. This action cannot be undone."
        confirmText="Delete"
        variant="destructive"
        open={deleteTargetId !== null}
        onOpenChange={open => {
          if (!open) setDeleteTargetId(null)
        }}
        onConfirm={handleDelete}
      />
    </div>
  )
}
