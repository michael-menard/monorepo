import { 
  Button
} from '@repo/ui'
import { Link } from '@tanstack/react-router'
import { z } from 'zod'

// Zod schema for layout props
const LayoutPropsSchema = z.object({
  children: z.any(),
});

type LayoutProps = z.infer<typeof LayoutPropsSchema>;

function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      {/* Sticky Navbar */}
      <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="px-6">
          <div className="flex h-16 items-center justify-between">
            {/* Left side - Brand */}
            <div className="flex items-center">
              <Link to="/" className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-sm">
                  <span className="text-primary-foreground font-bold text-sm">M</span>
                </div>
                <span className="font-bold text-xl text-foreground">MOC Builder</span>
              </Link>
            </div>

            {/* Center - Navigation Menu */}
            <div className="hidden md:flex items-center">
              {/* Navigation menu removed */}
            </div>

            {/* Right side - User Actions */}
            <div className="flex items-center space-x-4">
              {/* For now, always show Sign In/Sign Up since auth is not implemented */}
              <div className="flex items-center space-x-2">
                <Link to="/auth/login">
                  <Button variant="outline" size="default">
                    Sign In
                  </Button>
                </Link>
                <Link to="/auth/signup">
                  <Button 
                    variant="default" 
                    size="default"
                  >
                    Sign Up
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>
    </div>
  )
}

export default Layout 