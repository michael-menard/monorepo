import { 
  AppAvatar,
  Badge,
  Button,
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
  Menu
} from 'lucide-react'
import { z } from 'zod'

// Zod schema for layout props
const LayoutPropsSchema = z.object({
  children: z.any(),
});

type LayoutProps = z.infer<typeof LayoutPropsSchema>;

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

  // Handler for avatar upload
  const handleAvatarUpload = async (file: File) => {
    // Simulate upload delay
    await new Promise((resolve) => setTimeout(resolve, 1000));
    
    // In a real app, you would upload the file to your server
    console.log('Avatar uploaded:', file.name);
    
    // Update the mock auth state with new avatar URL
    // mockAuth.user.avatar = URL.createObjectURL(file);
  };

  // Handler for profile navigation
  const handleProfileClick = () => {
    console.log('Profile clicked - navigate to profile page');
    // In a real app, you would navigate to the profile page
    // You can use the router here: router.navigate({ to: '/profile' });
  };

  // Handler for logout
  const handleLogout = () => {
    console.log('Logout confirmed');
    // In a real app, you would clear auth state and redirect to login
    // You can use the router here: router.navigate({ to: '/login' });
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
                // Authenticated user - Show AppAvatar
                <AppAvatar
                  avatarUrl={mockAuth.user.avatar || undefined}
                  userName={mockAuth.user.name}
                  userEmail={mockAuth.user.email}
                  onAvatarUpload={handleAvatarUpload}
                  onProfileClick={handleProfileClick}
                  onLogout={handleLogout}
                  size="sm"
                  showEditButton={true}
                  disabled={false}
                />
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