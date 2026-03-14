import { ThemeProvider, Toaster, TooltipProvider } from '@repo/app-component-library'
import { store } from './store'
import { Provider } from 'react-redux'
import { RoadmapPage } from './pages/RoadmapPage'

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
            <main>
              <RoadmapPage />
            </main>
          </div>
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </Provider>
  )
}
