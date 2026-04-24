'use client'

import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { DesignSystemNav } from '@/components/design-system-nav'
import { Palette, Type, LayoutGrid, Layers } from 'lucide-react'

const sections = [
  {
    href: '/foundations',
    title: 'Foundations',
    description: 'Color palette, gradients, typography, layout & spacing, and CSS variables.',
    icon: Palette,
  },
  {
    href: '/components',
    title: 'Components',
    description:
      'Buttons, form elements, cards, badges, avatars, tooltips, dialogs, tables, tabs, selects, inputs, dividers, and alerts.',
    icon: LayoutGrid,
  },
  {
    href: '/patterns',
    title: 'Patterns',
    description: 'Image card overlays, gauge charts, dashboard patterns, and sample components.',
    icon: Layers,
  },
  {
    href: '/style-guide',
    title: 'Style Guide',
    description: 'The Dark Academia style guide with theme philosophy and design principles.',
    icon: Type,
  },
]

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background transition-colors duration-300">
      <DesignSystemNav />

      <main className="max-w-6xl mx-auto px-6 py-12 space-y-16">
        <section className="space-y-4">
          <h2 className="text-3xl font-bold text-foreground text-balance">
            A cohesive design system inspired by old libraries, vintage books, and scholarly
            elegance.
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed max-w-3xl">
            This style guide showcases both light and dark themes built around warm earth tones,
            forest greens, and burgundy accents. Toggle between themes to see how each adapts while
            maintaining visual harmony.
          </p>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {sections.map(section => (
            <Link key={section.href} href={section.href} className="group">
              <Card className="h-full transition-colors group-hover:border-primary/50">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-md bg-primary/10">
                      <section.icon className="h-5 w-5 text-primary" />
                    </div>
                    <CardTitle className="group-hover:text-primary transition-colors">
                      {section.title}
                    </CardTitle>
                  </div>
                  <CardDescription className="mt-2">{section.description}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </section>

        <footer className="border-t border-border pt-8">
          <p className="text-center text-sm text-muted-foreground">Dark Academia Design System</p>
        </footer>
      </main>
    </div>
  )
}
