/**
 * Empty Dashboard Component
 * Story 2.8: Helpful empty state for new users
 */

import { Link } from '@tanstack/react-router'
import { Button } from '@repo/app-component-library'
import { Blocks, Plus, Images, Heart, BookOpen } from 'lucide-react'

/**
 * Empty state displayed when user has no MOCs
 */
export function EmptyDashboard() {
  const features = [
    {
      icon: Blocks,
      title: 'Organize MOCs',
      description: 'Keep all your MOC instructions in one place',
    },
    {
      icon: Images,
      title: 'Gallery View',
      description: 'Browse your collection with beautiful thumbnails',
    },
    {
      icon: Heart,
      title: 'Wishlist',
      description: 'Track sets and MOCs you want to build',
    },
    {
      icon: BookOpen,
      title: 'Instructions',
      description: 'Access your PDF instructions anytime',
    },
  ]

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {/* Hero Icon */}
      <div className="p-4 rounded-full bg-primary/10 mb-6">
        <Blocks className="h-16 w-16 text-primary" />
      </div>

      {/* Welcome Message */}
      <h2 className="text-2xl font-bold mb-2">Welcome to LEGO MOC Instructions!</h2>
      <p className="text-muted-foreground max-w-md mb-8">
        Organize your MOC instructions, track your collection, and manage your wishlist all in one
        place.
      </p>

      {/* CTA Button */}
      <Button asChild size="lg" className="mb-12">
        <Link to="/instructions/new">
          <Plus className="mr-2 h-5 w-5" />
          Add Your First MOC
        </Link>
      </Button>

      {/* Feature Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-4xl">
        {features.map(feature => (
          <div key={feature.title} className="text-center p-4">
            <div className="p-3 rounded-lg bg-muted inline-block mb-3">
              <feature.icon className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="font-semibold mb-1">{feature.title}</h3>
            <p className="text-sm text-muted-foreground">{feature.description}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
