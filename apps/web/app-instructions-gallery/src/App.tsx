import { ThemeProvider } from '@repo/app-component-library'
import { InstuctionsGalleryModule } from './Module'

export function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="instructions-gallery-theme">
      <InstuctionsGalleryModule />
    </ThemeProvider>
  )
}
