import { z } from 'zod'
import { Link, useNavigate } from '@tanstack/react-router'
import { Button } from '@repo/ui'
// If useAuth is not exported, fallback to unauthenticated navigation for now
// import { useAuth } from '@repo/auth'
import { 
  Heart, 
  LogOut, 
  Search, 
  User 
} from 'lucide-react'

// Zod schema for navigation props
const NavigationPropsSchema = z.object({
  className: z.string().optional(),
})

type NavigationProps = z.infer<typeof NavigationPropsSchema>

function Navigation({ className = '' }: NavigationProps) {
  const isAuthenticated = false
  const user = undefined as unknown as { name?: string; email?: string }
  const logout = async () => {}
  const navigate = useNavigate()

  const handleLogout = async () => {
    try {
      await logout()
      navigate({ to: '/' })
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  return (
    <nav className={`flex items-center space-x-4 ${className}`}>
      {/* Main Navigation Links */}
      <div className="hidden md:flex items-center space-x-6">
        <Link 
          to="/moc-gallery" 
          className="flex items-center space-x-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <Search className="h-4 w-4" />
          <span>Browse MOCs</span>
        </Link>
        
        {isAuthenticated && (
          <>
            <Link 
              to="/wishlist" 
              className="flex items-center space-x-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <Heart className="h-4 w-4" />
              <span>Wishlist</span>
            </Link>
            <Link 
              to="/profile" 
              className="flex items-center space-x-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <User className="h-4 w-4" />
              <span>Profile</span>
            </Link>
          </>
        )}
      </div>

      {/* User Actions */}
      <div className="flex items-center space-x-2">
        {isAuthenticated ? (
          <>
            {/* User Menu */}
            <div className="flex items-center space-x-2">
              <span className="text-sm text-muted-foreground hidden sm:block">
                {user?.name || user?.email}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="gap-2"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </div>
          </>
        ) : (
          <>
            <Link to="/auth/login">
              <Button variant="outline" size="sm">
                Sign In
              </Button>
            </Link>
            <Link to="/auth/signup">
              <Button size="sm">
                Sign Up
              </Button>
            </Link>
          </>
        )}
      </div>
    </nav>
  )
}

export default Navigation 