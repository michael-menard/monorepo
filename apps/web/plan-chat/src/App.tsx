import { configureStore } from '@reduxjs/toolkit'
import { Provider } from 'react-redux'
import { ThemeProvider } from '@repo/app-component-library'
import { chatSlice } from './store/chatSlice'
import { ChatPage } from './pages/ChatPage'

const devStore = configureStore({
  reducer: {
    chat: chatSlice.reducer,
  },
})

export function App() {
  return (
    <Provider store={devStore}>
      <ThemeProvider defaultTheme="dark" storageKey="plan-chat-theme">
        <div className="min-h-screen bg-gradient-to-br from-black via-slate-900 to-slate-950 text-slate-100">
          <ChatPage />
        </div>
      </ThemeProvider>
    </Provider>
  )
}
