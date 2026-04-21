/**
 * Standalone App for development
 *
 * Wraps the InstructionsModule with BrowserRouter for local dev server.
 */
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider } from '@repo/app-component-library'
import { InstructionsModule } from './Module'

export function App() {
  return (
    <BrowserRouter basename="/instructions">
      <ThemeProvider defaultTheme="system" storageKey="instructions-gallery-theme">
        <InstructionsModule />
      </ThemeProvider>
    </BrowserRouter>
  )
}
