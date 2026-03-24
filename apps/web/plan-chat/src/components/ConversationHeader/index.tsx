import { useState } from 'react'
import { useSelector } from 'react-redux'
import { Button } from '@repo/app-component-library'
import { FileOutput, Archive, Loader2, ExternalLink } from 'lucide-react'
import { selectActiveConversation, selectMessages } from '../../store/chatSlice'
import * as chatApi from '../../api/chatApi'

export function ConversationHeader() {
  const conversation = useSelector(selectActiveConversation)
  const messages = useSelector(selectMessages)
  const [isConverting, setIsConverting] = useState(false)
  const [isArchiving, setIsArchiving] = useState(false)
  const [planResult, setPlanResult] = useState<{ planId: string; title: string } | null>(null)

  if (!conversation) return null

  const hasMessages = messages.length > 0

  const handleConvertToPlan = async () => {
    setIsConverting(true)
    try {
      const result = await chatApi.convertToPlan(conversation.id)
      setPlanResult(result)
    } catch {
      // Could add error toast here
    } finally {
      setIsConverting(false)
    }
  }

  const handleArchive = async () => {
    setIsArchiving(true)
    try {
      await chatApi.archiveConversation(conversation.id)
    } catch {
      // Could add error toast here
    } finally {
      setIsArchiving(false)
    }
  }

  return (
    <div className="flex items-center justify-between border-b border-slate-700/50 px-4 py-2">
      <h2 className="truncate text-sm font-medium text-slate-200">{conversation.title}</h2>
      <div className="flex items-center gap-2">
        {planResult && (
          <span className="flex items-center gap-1 text-xs text-emerald-400">
            <ExternalLink className="h-3 w-3" />
            Plan created: {planResult.title}
          </span>
        )}
        <Button
          onClick={handleArchive}
          disabled={!hasMessages || isArchiving}
          variant="ghost"
          size="sm"
          className="gap-1.5 text-xs text-slate-400 hover:text-slate-200"
        >
          {isArchiving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Archive className="h-3.5 w-3.5" />}
          Archive
        </Button>
        <Button
          onClick={handleConvertToPlan}
          disabled={!hasMessages || isConverting}
          variant="ghost"
          size="sm"
          className="gap-1.5 text-xs text-slate-400 hover:text-slate-200"
        >
          {isConverting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileOutput className="h-3.5 w-3.5" />}
          Convert to Plan
        </Button>
      </div>
    </div>
  )
}
