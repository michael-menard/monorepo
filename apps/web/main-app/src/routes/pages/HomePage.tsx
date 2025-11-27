import React from 'react'
import { useSelector } from 'react-redux'
import { Link } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import { z } from 'zod'
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
  Zap,
} from 'lucide-react'
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@repo/ui'
import { selectAuth } from '@/store/slices/authSlice'

// Zod schemas for type safety (following coding style preferences)
const FeatureSchema = z.object({
  icon: z.any(), // LucideIcon type
  title: z.string(),
  description: z.string(),
  action: z.string(),
  href: z.string(),
  requiresAuth: z.boolean().optional(),
})

const StatSchema = z.object({
  label: z.string(),
  value: z.string(),
  icon: z.any(), // LucideIcon type
})

const BenefitSchema = z.object({
  icon: z.any(), // LucideIcon type
  title: z.string(),
  description: z.string(),
})

type Feature = z.infer<typeof FeatureSchema>
type Stat = z.infer<typeof StatSchema>
type Benefit = z.infer<typeof BenefitSchema>

// LEGO brick animation variants
const brickVariants = {
  initial: { scale: 0, rotate: -180, opacity: 0 },
  animate: { scale: 1, rotate: 0, opacity: 1 },
  hover: { scale: 1.05, rotate: 5 },
}

const containerVariants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
}

const itemVariants = {
  initial: { y: 20, opacity: 0 },
  animate: { y: 0, opacity: 1 },
}

export function HomePage() {
  const auth = useSelector(selectAuth)

  const features: Feature[] = [
    {
      icon: BookOpen,
      title: 'Browse MOC Instructions',
      description: 'Explore thousands of custom LEGO MOC instructions from the community',
      action: 'Browse Gallery',
      href: '/gallery',
    },
    {
      icon: Heart,
      title: 'Personal Wishlist',
      description: 'Save your favorite MOCs and track your building progress',
      action: 'View Wishlist',
      href: '/wishlist',
      requiresAuth: true,
    },
    {
      icon: User,
      title: 'User Profiles',
      description: 'Manage your profile, uploads, and building history',
      action: 'View Profile',
      href: '/profile',
      requiresAuth: true,
    },
    {
      icon: Upload,
      title: 'Share Your MOCs',
      description: 'Upload and share your own custom LEGO creations',
      action: 'Upload MOC',
      href: '/gallery',
      requiresAuth: true,
    },
  ]

  const stats: Stat[] = [
    { label: 'MOC Instructions', value: '10,000+', icon: BookOpen },
    { label: 'Active Users', value: '5,000+', icon: Users },
    { label: 'Downloads', value: '50,000+', icon: Download },
    { label: 'Community Rating', value: '4.8★', icon: Star },
  ]

  const benefits: Benefit[] = [
    {
      icon: Shield,
      title: 'Secure & Reliable',
      description: 'Your MOCs and data are protected with enterprise-grade security',
    },
    {
      icon: Zap,
      title: 'Lightning Fast',
      description: 'Optimized performance for quick browsing and seamless building',
    },
    {
      icon: Users,
      title: 'Community Driven',
      description: 'Join thousands of builders sharing their amazing creations',
    },
  ]

  return (
    <motion.div
      initial="initial"
      animate="animate"
      variants={containerVariants}
      className="space-y-16"
    >
      {/* Hero Section */}
      <motion.section variants={itemVariants} className="container mx-auto px-4 py-16">
        <div className="text-center space-y-6">
          <motion.h1
            variants={itemVariants}
            className="text-5xl font-bold tracking-tight bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent"
          >
            LEGO MOC Hub
          </motion.h1>
          <motion.p
            variants={itemVariants}
            className="text-xl text-muted-foreground max-w-3xl mx-auto"
          >
            Discover, build, and share custom LEGO MOC instructions. Join our community of builders
            and explore thousands of unique creations from around the world.
          </motion.p>

          {/* Call to Action Buttons */}
          <motion.div
            variants={itemVariants}
            className="flex flex-col sm:flex-row justify-center gap-4"
          >
            {auth.isAuthenticated ? (
              <>
                <Link to="/gallery">
                  <motion.div whileHover="hover" variants={brickVariants}>
                    <Button size="lg" className="gap-2 w-full sm:w-auto">
                      <Search className="h-4 w-4" />
                      Browse MOCs
                    </Button>
                  </motion.div>
                </Link>
                <Link to="/wishlist">
                  <motion.div whileHover="hover" variants={brickVariants}>
                    <Button
                      variant="outline"
                      size="lg"
                      className="gap-2 border border-input bg-background w-full sm:w-auto"
                    >
                      <Heart className="h-4 w-4" />
                      My Wishlist
                    </Button>
                  </motion.div>
                </Link>
              </>
            ) : (
              <>
                <Link to="/gallery">
                  <motion.div whileHover="hover" variants={brickVariants}>
                    <Button size="lg" className="gap-2 w-full sm:w-auto">
                      <Search className="h-4 w-4" />
                      Browse MOCs
                    </Button>
                  </motion.div>
                </Link>
                <Link to="/auth/signup">
                  <motion.div whileHover="hover" variants={brickVariants}>
                    <Button
                      variant="outline"
                      size="lg"
                      className="gap-2 border border-input bg-background w-full sm:w-auto"
                    >
                      <User className="h-4 w-4" />
                      Sign Up
                    </Button>
                  </motion.div>
                </Link>
              </>
            )}
          </motion.div>

          {auth.isAuthenticated && auth.user ? (
            <motion.p variants={itemVariants} className="text-sm text-muted-foreground">
              Welcome back, {auth.user.name || auth.user.email}!
              <Link to="/profile" className="text-primary hover:underline ml-1">
                View Profile
              </Link>
            </motion.p>
          ) : null}
        </div>
      </motion.section>

      {/* Stats Section */}
      <motion.section variants={itemVariants} className="container mx-auto px-4 py-12">
        <motion.div variants={containerVariants} className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map((stat, index) => (
            <motion.div
              key={index}
              variants={brickVariants}
              whileHover="hover"
              initial="initial"
              animate="animate"
              transition={{ delay: index * 0.1 }}
            >
              <Card className="text-center hover:shadow-lg transition-shadow">
                <CardContent className="pt-6">
                  <stat.icon className="h-8 w-8 mx-auto mb-2 text-primary" />
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <div className="text-sm text-muted-foreground">{stat.label}</div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </motion.section>

      {/* Features Section */}
      <motion.section variants={itemVariants} className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <motion.h2 variants={itemVariants} className="text-3xl font-bold mb-4">
            Everything You Need to Build
          </motion.h2>
          <motion.p variants={itemVariants} className="text-lg text-muted-foreground">
            From browsing to building, we've got you covered
          </motion.p>
        </div>

        <motion.div
          variants={containerVariants}
          className="grid md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {features.map((feature, index) => (
            <motion.div
              key={index}
              variants={brickVariants}
              whileHover="hover"
              initial="initial"
              animate="animate"
              transition={{ delay: index * 0.1 }}
            >
              <Card className="hover:shadow-lg transition-shadow h-full">
                <CardHeader>
                  <feature.icon className="h-8 w-8 text-primary mb-2" />
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                  <CardDescription>{feature.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  {feature.requiresAuth && !auth.isAuthenticated ? (
                    <Button
                      variant="outline"
                      className="w-full border border-input bg-background"
                      disabled
                      aria-label={`${feature.action} - Login required`}
                    >
                      Login Required
                    </Button>
                  ) : (
                    <Link to={feature.href} className="w-full">
                      <Button
                        variant="outline"
                        className="w-full border border-input bg-background"
                        aria-label={feature.action}
                      >
                        {feature.action}
                      </Button>
                    </Link>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </motion.section>

      {/* Benefits Section */}
      <motion.section
        variants={itemVariants}
        className="container mx-auto px-4 py-16 bg-muted/30 rounded-lg"
      >
        <div className="text-center mb-12">
          <motion.h2 variants={itemVariants} className="text-3xl font-bold mb-4">
            Why Choose LEGO MOC Hub?
          </motion.h2>
          <motion.p variants={itemVariants} className="text-lg text-muted-foreground">
            Built by builders, for builders
          </motion.p>
        </div>

        <motion.div variants={containerVariants} className="grid md:grid-cols-3 gap-8">
          {benefits.map((benefit, index) => (
            <motion.div key={index} variants={itemVariants} className="text-center space-y-4">
              <motion.div
                variants={brickVariants}
                whileHover="hover"
                className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full"
              >
                <benefit.icon className="h-8 w-8 text-primary" />
              </motion.div>
              <h3 className="text-xl font-semibold">{benefit.title}</h3>
              <p className="text-muted-foreground">{benefit.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </motion.section>

      {/* CTA Section */}
      <motion.section variants={itemVariants} className="container mx-auto px-4 py-16">
        <div className="text-center space-y-6">
          <motion.h2 variants={itemVariants} className="text-3xl font-bold">
            Ready to Start Building?
          </motion.h2>
          <motion.p variants={itemVariants} className="text-lg text-muted-foreground">
            Join our community and discover amazing LEGO MOCs today
          </motion.p>
          <motion.div
            variants={itemVariants}
            className="flex flex-col sm:flex-row justify-center gap-4"
          >
            <Link to="/gallery">
              <motion.div whileHover="hover" variants={brickVariants}>
                <Button size="lg" className="gap-2 w-full sm:w-auto">
                  <Search className="h-4 w-4" />
                  Start Browsing
                </Button>
              </motion.div>
            </Link>
            {!auth.isAuthenticated && (
              <Link to="/auth/signup">
                <motion.div whileHover="hover" variants={brickVariants}>
                  <Button
                    variant="outline"
                    size="lg"
                    className="gap-2 border border-input bg-background w-full sm:w-auto"
                  >
                    <User className="h-4 w-4" />
                    Create Account
                  </Button>
                </motion.div>
              </Link>
            )}
          </motion.div>
        </div>
      </motion.section>
    </motion.div>
  )
}
