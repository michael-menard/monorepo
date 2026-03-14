import { ThemeProvider, Toaster, TooltipProvider } from '@repo/app-component-library'
import { store } from './store'
import { Provider } from 'react-redux'

export function App() {
  return (
    <Provider store={store}>
      <ThemeProvider defaultTheme="system" storageKey="workflow-roadmap-theme">
        <TooltipProvider>
          <div className="min-h-screen bg-background">
            <header className="border-b">
              <div className="container mx-auto px-4 py-4">
                <h1 className="text-2xl font-bold">Workflow Roadmap</h1>
              </div>
            </header>
            <main className="container mx-auto px-4 py-8">
              <p>Roadmap visualization coming soon</p>
            </main>
          </div>
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </Provider>
  )
}
