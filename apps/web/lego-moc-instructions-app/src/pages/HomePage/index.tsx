import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@repo/ui'
import { Link } from '@tanstack/react-router'
import { 
  BookOpen, 
  Download,
  Heart, 
  Search, 
  Shield,
  Star,
  Upload, 
  User, 
  Users,
  Zap
} from 'lucide-react'
import { config } from '../../config/environment.js'

function HomePage() {
  // Mock authentication hook - will be replaced with real auth later
  const mockAuth = {
    isAuthenticated: false, // Set to true to test authenticated access
    user: {
      id: '1',
      email: 'test@example.com',
      name: 'Test User',
      role: 'user',
      emailVerified: true,
    },
  };

  const features = [
    {
      icon: BookOpen,
      title: "Browse MOC Instructions",
      description: "Explore thousands of custom LEGO MOC instructions from the community",
      action: "Browse Gallery",
      href: "/moc-instructions"
    },
    {
      icon: Heart,
      title: "Personal Wishlist",
      description: "Save your favorite MOCs and track your building progress",
      action: "View Wishlist",
      href: "/wishlist",
      requiresAuth: true
    },
    {
      icon: User,
      title: "User Profiles",
      description: "Manage your profile, uploads, and building history",
      action: "View Profile",
      href: "/profile",
      requiresAuth: true
    },
    {
      icon: Upload,
      title: "Share Your MOCs",
      description: "Upload and share your own custom LEGO creations",
      action: "Upload MOC",
      href: "/moc-instructions/new",
      requiresAuth: true
    }
  ];

  const stats = [
    { label: "MOC Instructions", value: "10,000+", icon: BookOpen },
    { label: "Active Users", value: "5,000+", icon: Users },
    { label: "Downloads", value: "50,000+", icon: Download },
    { label: "Community Rating", value: "4.8★", icon: Star }
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center space-y-6">
          <h1 className="text-5xl font-bold tracking-tight">
            {config.app.name}
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Discover, build, and share custom LEGO MOC instructions. Join our community of builders 
            and explore thousands of unique creations from around the world.
          </p>
          
          {/* Call to Action Buttons */}
          <div className="flex justify-center space-x-4">
            {mockAuth.isAuthenticated ? (
              <>
                <Link to="/moc-instructions">
                  <Button size="lg" className="gap-2">
                    <Search className="h-4 w-4" />
                    Browse MOCs
                  </Button>
                </Link>
                <Link to="/wishlist">
                  <Button variant="outline" size="lg" className="gap-2">
                    <Heart className="h-4 w-4" />
                    My Wishlist
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <Link to="/moc-instructions">
                  <Button size="lg" className="gap-2">
                    <Search className="h-4 w-4" />
                    Browse MOCs
                  </Button>
                </Link>
                <Button variant="outline" size="lg" className="gap-2">
                  <User className="h-4 w-4" />
                  Sign Up
                </Button>
              </>
            )}
          </div>

          {mockAuth.isAuthenticated && (
            <p className="text-sm text-muted-foreground">
              Welcome back, {mockAuth.user.name}! 
              <Link to="/profile" className="text-primary hover:underline ml-1">
                View Profile
              </Link>
            </p>
          )}
        </div>
      </section>

      {/* Stats Section */}
      <section className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map((stat, index) => (
            <Card key={index} className="text-center">
              <CardContent className="pt-6">
                <stat.icon className="h-8 w-8 mx-auto mb-2 text-primary" />
                <div className="text-2xl font-bold">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Everything You Need to Build</h2>
          <p className="text-lg text-muted-foreground">
            From browsing to building, we've got you covered
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <Card key={index} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <feature.icon className="h-8 w-8 text-primary mb-2" />
                <CardTitle className="text-lg">{feature.title}</CardTitle>
                <CardDescription>{feature.description}</CardDescription>
              </CardHeader>
              <CardContent>
                {feature.requiresAuth && !mockAuth.isAuthenticated ? (
                  <Button variant="outline" className="w-full" disabled>
                    Login Required
                  </Button>
                ) : (
                  <Link to={feature.href} className="w-full">
                    <Button variant="outline" className="w-full">
                      {feature.action}
                    </Button>
                  </Link>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Why Choose Us Section */}
      <section className="container mx-auto px-4 py-16 bg-muted/50 rounded-lg">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Why Choose Our Platform?</h2>
          <p className="text-lg text-muted-foreground">
            Built by builders, for builders
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="text-center space-y-4">
            <Shield className="h-12 w-12 mx-auto text-primary" />
            <h3 className="text-xl font-semibold">Secure & Reliable</h3>
            <p className="text-muted-foreground">
              Your creations and data are protected with enterprise-grade security
            </p>
          </div>
          
          <div className="text-center space-y-4">
            <Zap className="h-12 w-12 mx-auto text-primary" />
            <h3 className="text-xl font-semibold">Lightning Fast</h3>
            <p className="text-muted-foreground">
              Optimized for speed with instant search and quick downloads
            </p>
          </div>
          
          <div className="text-center space-y-4">
            <Users className="h-12 w-12 mx-auto text-primary" />
            <h3 className="text-xl font-semibold">Community Driven</h3>
            <p className="text-muted-foreground">
              Join thousands of builders sharing their passion for LEGO
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center space-y-6">
          <h2 className="text-3xl font-bold">Ready to Start Building?</h2>
          <p className="text-lg text-muted-foreground">
            Join our community and discover amazing LEGO MOCs today
          </p>
          <div className="flex justify-center space-x-4">
            <Link to="/moc-instructions">
              <Button size="lg" className="gap-2">
                <Search className="h-4 w-4" />
                Start Browsing
              </Button>
            </Link>
            {!mockAuth.isAuthenticated && (
              <Button variant="outline" size="lg" className="gap-2">
                <User className="h-4 w-4" />
                Create Account
              </Button>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}

export default HomePage 