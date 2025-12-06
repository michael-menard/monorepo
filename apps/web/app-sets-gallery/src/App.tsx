import { ThemeProvider } from '@repo/app-component-library'
import { AppSetsGalleryModule } from './Module'

export function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="app-sets-gallery-theme">
      <AppSetsGalleryModule />
    </ThemeProvider>
  )
}
