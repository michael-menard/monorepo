/**
 * @repo/plan-chat
 *
 * Plan Chat module entry point.
 * Exports page components and Redux slice for shell integration.
 */

export { ChatPage } from './pages/ChatPage'
export {
  chatSlice,
  chatActions,
  selectConversations,
  selectActiveConversationId,
  selectActiveConversation,
  selectMessages,
  selectIsLoading,
  selectDraft,
} from './store/chatSlice'
