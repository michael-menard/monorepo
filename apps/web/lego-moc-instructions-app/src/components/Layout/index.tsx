import { 
  Badge,
  Button,
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  cn
} from '@repo/ui'
import { Link } from '@tanstack/react-router'
import { 
  BookOpen
} from 'lucide-react'
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
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            {/* Left side - Brand */}
            <div className="flex items-center">
              <Link to="/" className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-sm">
                  <span className="text-primary-foreground font-bold text-sm">M</span>
                </div>
                <span className="font-bold text-xl text-foreground">MOC Builder</span>
                <Badge variant="secondary" className="ml-2 bg-tertiary text-tertiary-foreground">Beta</Badge>
              </Link>
            </div>

            {/* Center - Navigation Menu */}
            <div className="hidden md:flex items-center">
              <NavigationMenu>
                <NavigationMenuList>
                  <NavigationMenuItem>
                    <NavigationMenuLink asChild>
                      <Link to="/moc-instructions" className={cn(
                        "group inline-flex h-10 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none disabled:pointer-events-none disabled:opacity-50 data-[active]:bg-accent/50 data-[state=open]:bg-accent/50"
                      )}>
                        <BookOpen className="mr-2 h-4 w-4" />
                        Browse MOCs
                      </Link>
                    </NavigationMenuLink>
                  </NavigationMenuItem>
                </NavigationMenuList>
              </NavigationMenu>
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