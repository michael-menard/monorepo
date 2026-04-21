import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider, TooltipProvider } from '@repo/app-component-library'
import { WishlistModule } from './Module'

export function App() {
  return (
    <BrowserRouter basename="/wishlist">
      <ThemeProvider defaultTheme="system" storageKey="app-wishlist-gallery-theme">
        <TooltipProvider>
          <WishlistModule />
        </TooltipProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}
