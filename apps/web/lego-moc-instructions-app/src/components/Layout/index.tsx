import { 
  Avatar, 
  AvatarFallback, 
  AvatarImage, 
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  Separator,
  cn
} from '@repo/ui'
import { Link } from '@tanstack/react-router'
import { 
  BookOpen,
  Heart, 
  LogOut, 
  Menu,
  Settings,
  User, 
  X
} from 'lucide-react'

interface LayoutProps {
  children: React.ReactNode
}

function Layout({ children }: LayoutProps) {
  // Mock authentication state - will be replaced with real auth later
  const mockAuth = {
    isAuthenticated: false, // Set to true to test authenticated access
    user: {
      id: '1',
      email: 'test@example.com',
      name: 'Test User',
      role: 'user',
      emailVerified: true,
      avatar: null as string | null, // Will be replaced with real avatar URL
    },
  };

  const getUserInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky Navbar */}
      <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            {/* Left side - Brand */}
            <div className="flex items-center">
              <Link to="/" className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
                <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                  <span className="text-primary-foreground font-bold text-sm">M</span>
                </div>
                <span className="font-bold text-xl">MOC Builder</span>
                <Badge variant="secondary" className="ml-2">Beta</Badge>
              </Link>
            </div>

            {/* Center - Navigation Menu */}
            <div className="hidden md:flex items-center">
              <NavigationMenu>
                <NavigationMenuList>
                  <NavigationMenuItem>
                    <Link to="/moc-instructions">
                      <NavigationMenuLink className={cn(
                        "group inline-flex h-10 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none disabled:pointer-events-none disabled:opacity-50 data-[active]:bg-accent/50 data-[state=open]:bg-accent/50"
                      )}>
                        <BookOpen className="mr-2 h-4 w-4" />
                        Browse MOCs
                      </NavigationMenuLink>
                    </Link>
                  </NavigationMenuItem>
                  {mockAuth.isAuthenticated && (
                    <NavigationMenuItem>
                      <Link to="/wishlist">
                        <NavigationMenuLink className={cn(
                          "group inline-flex h-10 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none disabled:pointer-events-none disabled:opacity-50 data-[active]:bg-accent/50 data-[state=open]:bg-accent/50"
                        )}>
                          <Heart className="mr-2 h-4 w-4" />
                          Wishlist
                        </NavigationMenuLink>
                      </Link>
                    </NavigationMenuItem>
                  )}
                </NavigationMenuList>
              </NavigationMenu>
            </div>

            {/* Right side - User Actions */}
            <div className="flex items-center space-x-4">
              {mockAuth.isAuthenticated ? (
                // Authenticated user - Show Avatar with Dropdown
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                      <Avatar className="h-8 w-8">
                        <AvatarImage 
                          src={mockAuth.user.avatar || undefined} 
                          alt={mockAuth.user.name}
                        />
                        <AvatarFallback className="text-xs">
                          {getUserInitials(mockAuth.user.name)}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end" forceMount>
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">{mockAuth.user.name}</p>
                        <p className="text-xs leading-none text-muted-foreground">
                          {mockAuth.user.email}
                        </p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to="/profile" className="cursor-pointer">
                        <User className="mr-2 h-4 w-4" />
                        <span>Profile</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Settings</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Log out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                // Unauthenticated user - Show Sign In/Sign Up
                <div className="flex items-center space-x-2">
                  <Button variant="ghost" size="sm">
                    Sign In
                  </Button>
                  <Button size="sm">
                    Sign Up
                  </Button>
                </div>
              )}
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