import { useRef, useEffect } from 'react'
import { useSelector } from 'react-redux'
import { motion } from 'framer-motion'
import { cn } from '@repo/app-component-library'
import { FileText } from 'lucide-react'
import { selectMessages, selectIsStreaming, selectStreamingMessageId } from '../../store/chatSlice'
import type { Attachment } from '../../store/__types__'

const IMAGE_CONTENT_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']

function isImageAttachment(attachment: Attachment): boolean {
  return IMAGE_CONTENT_TYPES.includes(attachment.contentType)
}

function MessageAttachments({ attachments }: { attachments: Attachment[] }) {
  if (attachments.length === 0) return null

  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {attachments.map(attachment =>
        isImageAttachment(attachment) ? (
          <a
            key={attachment.id}
            href={attachment.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block overflow-hidden rounded-md border border-slate-700/50"
          >
            <img
              src={attachment.url}
              alt={attachment.filename}
              className="max-h-[200px] max-w-[300px] object-contain"
            />
          </a>
        ) : (
          <a
            key={attachment.id}
            href={attachment.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-md border border-slate-700/50 bg-slate-900/50 px-2.5 py-1.5 text-xs text-slate-300 hover:bg-slate-800/50"
          >
            <FileText className="h-4 w-4 text-slate-400" />
            <span className="max-w-[200px] truncate">{attachment.filename}</span>
          </a>
        ),
      )}
    </div>
  )
}

export function ChatMessages() {
  const messages = useSelector(selectMessages)
  const isStreaming = useSelector(selectIsStreaming)
  const streamingMessageId = useSelector(selectStreamingMessageId)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isStreaming])

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-3" role="log" aria-label="Chat messages">
      {messages.length === 0 && !isStreaming && (
        <p className="text-center text-sm text-muted-foreground py-12">
          Start a conversation to create a plan.
        </p>
      )}
      {messages.map(msg => (
        <motion.div
          key={msg.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}
        >
          <div
            className={cn(
              'max-w-[80%] px-3 py-2 text-sm',
              msg.role === 'user'
                ? 'rounded-2xl rounded-br-md bg-cyan-600/20 text-cyan-100'
                : 'rounded-2xl rounded-bl-md bg-slate-800 text-slate-200',
            )}
          >
            {msg.content ? <div className="whitespace-pre-wrap">{msg.content}</div> : null}
            {msg.attachments && msg.attachments.length > 0 ? (
              <MessageAttachments attachments={msg.attachments} />
            ) : null}
            {msg.id === streamingMessageId && (
              <span className="inline-block w-1.5 h-4 ml-0.5 bg-cyan-400 animate-pulse" />
            )}
          </div>
        </motion.div>
      ))}
      {isStreaming && messages.length > 0 && !messages.find(m => m.id === streamingMessageId) ? (
        <div className="flex justify-start">
          <div className="rounded-2xl rounded-bl-md bg-slate-800 px-3 py-2 text-sm text-slate-400 animate-pulse">
            Thinking...
          </div>
        </div>
      ) : null}
      <div ref={bottomRef} />
    </div>
  )
}
