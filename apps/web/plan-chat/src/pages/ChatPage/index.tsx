import { useSelector } from 'react-redux'
import { selectActiveConversationId } from '../../store/chatSlice'
import { ChatSidebar } from '../../components/ChatSidebar'
import { ChatMessages } from '../../components/ChatMessages'
import { ChatInput } from '../../components/ChatInput'
import { EmptyChat } from '../../components/EmptyChat'
import { ConversationHeader } from '../../components/ConversationHeader'

export function ChatPage() {
  const activeId = useSelector(selectActiveConversationId)

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      <ChatSidebar />
      <div className="flex flex-1 flex-col min-w-0">
        {activeId ? (
          <>
            <ConversationHeader />
            <ChatMessages />
          </>
        ) : (
          <EmptyChat />
        )}
        <ChatInput />
      </div>
    </div>
  )
}
