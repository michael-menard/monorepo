import { ThemeProvider } from '@repo/app-component-library'
import { BrowserRouter } from 'react-router-dom'
import { SetsModule } from './Module'

export function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="app-sets-gallery-theme">
      <BrowserRouter basename="/sets">
        <SetsModule />
      </BrowserRouter>
    </ThemeProvider>
  )
}
