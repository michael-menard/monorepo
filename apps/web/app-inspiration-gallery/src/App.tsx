import { ThemeProvider } from '@repo/app-component-library'
import { AppInspirationGalleryModule } from './Module'

export function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="app-inspiration-gallery-theme">
      <AppInspirationGalleryModule />
    </ThemeProvider>
  )
}
