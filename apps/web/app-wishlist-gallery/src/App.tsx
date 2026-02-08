import { ThemeProvider, TooltipProvider } from '@repo/app-component-library'
import { AppWishlistGalleryModule } from './Module'

export function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="app-wishlist-gallery-theme">
      <TooltipProvider>
        <AppWishlistGalleryModule />
      </TooltipProvider>
    </ThemeProvider>
  )
}
