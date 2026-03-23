import { useCallback, useRef } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { Button } from '@repo/app-component-library'
import { Send, Paperclip, X, FileText, Loader2 } from 'lucide-react'
import {
  chatActions,
  selectDraft,
  selectIsStreaming,
  selectActiveConversationId,
  selectPendingAttachments,
  createConversationAsync,
  sendMessageAsync,
} from '../../store/chatSlice'
import type { Attachment } from '../../store/__types__'

const ACCEPTED_FILE_TYPES =
  'image/png,image/jpeg,image/webp,image/gif,.txt,.md,.json,.yaml,.yml,.ts,.tsx,.js,.jsx,.css,.html,.xml,.csv,.log'

const IMAGE_CONTENT_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']

function isImageAttachment(attachment: Attachment): boolean {
  return IMAGE_CONTENT_TYPES.includes(attachment.contentType)
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}

export function ChatInput() {
  const dispatch = useDispatch()
  const draft = useSelector(selectDraft)
  const isStreaming = useSelector(selectIsStreaming)
  const activeId = useSelector(selectActiveConversationId)
  const pendingAttachments = useSelector(selectPendingAttachments)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pendingFilesRef = useRef<File[]>([])

  const canSend = (draft.trim().length > 0 || pendingAttachments.length > 0) && !isStreaming

  const handleSend = useCallback(async () => {
    const trimmed = draft.trim()
    if (!trimmed && pendingAttachments.length === 0) return

    let conversationId = activeId

    // Create conversation via API if none active
    if (!conversationId) {
      const result = await (dispatch as any)(createConversationAsync(trimmed.slice(0, 40) || undefined))
      if (result.error) return
      conversationId = result.payload.id
    }

    const files = pendingFilesRef.current.length > 0 ? [...pendingFilesRef.current] : undefined
    const attachments = pendingAttachments.length > 0 ? [...pendingAttachments] : undefined

    dispatch(chatActions.setDraft(''))
    dispatch(chatActions.clearPendingAttachments())
    pendingFilesRef.current = []

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }

    ;(dispatch as any)(
      sendMessageAsync({
        conversationId: conversationId!,
        content: trimmed,
        attachments: files ? undefined : attachments,
        files,
      }),
    )
  }, [dispatch, draft, activeId, pendingAttachments])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSend()
      }
    },
    [handleSend],
  )

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      dispatch(chatActions.setDraft(e.target.value))
      const el = e.target
      el.style.height = 'auto'
      el.style.height = `${Math.min(el.scrollHeight, 200)}px`
    },
    [dispatch],
  )

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (!files) return

      const remaining = 5 - pendingAttachments.length
      const toAdd = Array.from(files).slice(0, remaining)

      for (const file of toAdd) {
        pendingFilesRef.current.push(file)
        const attachment: Attachment = {
          id: crypto.randomUUID(),
          filename: file.name,
          contentType: file.type,
          size: file.size,
          url: URL.createObjectURL(file),
        }
        dispatch(chatActions.addPendingAttachment(attachment))
      }

      e.target.value = ''
    },
    [dispatch, pendingAttachments.length],
  )

  const handleRemoveAttachment = useCallback(
    (id: string) => {
      const idx = pendingAttachments.findIndex(a => a.id === id)
      if (idx >= 0) {
        pendingFilesRef.current.splice(idx, 1)
      }
      dispatch(chatActions.removePendingAttachment(id))
    },
    [dispatch, pendingAttachments],
  )

  const handleAttachClick = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  return (
    <div className="border-t border-slate-700/50 p-3">
      {pendingAttachments.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2" aria-label="Pending attachments">
          {pendingAttachments.map(attachment => (
            <div
              key={attachment.id}
              className="group relative flex items-center gap-1.5 rounded-md border border-slate-700 bg-slate-800/50 px-2 py-1.5 text-xs text-slate-300"
            >
              {isImageAttachment(attachment) ? (
                <img
                  src={attachment.url}
                  alt={attachment.filename}
                  className="h-8 w-8 rounded object-cover"
                />
              ) : (
                <FileText className="h-4 w-4 text-slate-400" />
              )}
              <span className="max-w-[120px] truncate">{attachment.filename}</span>
              <span className="text-slate-500">{formatFileSize(attachment.size)}</span>
              <button
                onClick={() => handleRemoveAttachment(attachment.id)}
                className="ml-1 rounded-full p-0.5 text-slate-500 hover:bg-slate-700 hover:text-slate-300"
                aria-label={`Remove ${attachment.filename}`}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ACCEPTED_FILE_TYPES}
          onChange={handleFileSelect}
          className="hidden"
          aria-label="Attach files"
        />
        <Button
          onClick={handleAttachClick}
          disabled={isStreaming || pendingAttachments.length >= 5}
          size="icon"
          variant="ghost"
          className="self-end text-slate-400 hover:text-slate-200"
          aria-label="Attach file"
        >
          <Paperclip className="h-4 w-4" />
        </Button>
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Describe the plan you want to create..."
          className="flex-1 resize-none rounded-md border border-slate-700 bg-slate-800/50 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          rows={1}
          aria-label="Chat message input"
        />
        <Button
          onClick={handleSend}
          disabled={!canSend}
          size="icon"
          className="self-end"
          aria-label="Send message"
        >
          {isStreaming ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  )
}
