import { z } from 'zod'
import { Link } from '@tanstack/react-router'
import Navigation from '../Navigation'

// Zod schema for layout props
const LayoutPropsSchema = z.object({
  children: z.any(),
});

type LayoutProps = z.infer<typeof LayoutPropsSchema>;

function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-r from-secondary via-tertiary to-info">
      {/* Sticky Navbar - Full Width */}
      <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        {/* Navbar Content - Centered with Max Width */}
        <div className="w-full max-w-[1200px] mx-auto px-6">
          <div className="flex h-16 items-center justify-between">
            {/* Left side - Brand */}
            <div className="flex items-center">
              <Link to="/" className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
                <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center shadow-sm">
                  <span className="text-primary-foreground font-bold text-sm">M</span>
                </div>
                <span className="font-bold text-xl text-foreground">MOC Builder</span>
              </Link>
            </div>

            {/* Right side - Navigation */}
            <div className="flex items-center">
              <Navigation />
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content Container - Centered with Max Width */}
      <div className="w-full max-w-[1200px] mx-auto">
        <main className="flex-1 p-10">
          {children}
        </main>
      </div>
    </div>
  )
}

export default Layout 