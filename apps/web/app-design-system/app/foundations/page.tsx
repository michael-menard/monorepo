'use client'

import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { DesignSystemNav } from '@/components/design-system-nav'
import { Type, Palette, LayoutGrid } from 'lucide-react'

const sections = [
  {
    href: '/typography',
    title: 'Typography',
    description:
      'Font system (Cormorant Garamond, Lora, Geist Mono), type scale, responsive sizing, and usage examples.',
    icon: Type,
  },
  {
    href: '/colors',
    title: 'Colors',
    description:
      'Color palette, gradients (1/2/3-color, mesh, borders), and CSS variable reference.',
    icon: Palette,
  },
  {
    href: '/layout-spacing',
    title: 'Layout & Spacing',
    description: 'Spacing scale, container widths, breakpoints, and grid patterns.',
    icon: LayoutGrid,
  },
]

export default function FoundationsPage() {
  return (
    <div className="min-h-screen bg-background transition-colors duration-300">
      <DesignSystemNav />

      <main className="max-w-6xl mx-auto px-6 py-12 space-y-16">
        <section className="space-y-4">
          <h2 className="text-3xl font-bold text-foreground">Foundations</h2>
          <p className="text-lg text-muted-foreground leading-relaxed max-w-3xl">
            The building blocks of the Dark Academia design system — typography, colors, and layout.
          </p>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {sections.map(section => (
            <Link key={section.href} href={section.href} className="group">
              <Card className="h-full transition-colors group-hover:border-primary/50">
                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-md bg-primary/10">
                      <section.icon className="h-5 w-5 text-primary" />
                    </div>
                    <CardTitle className="group-hover:text-primary transition-colors">
                      {section.title}
                    </CardTitle>
                  </div>
                  <CardDescription>{section.description}</CardDescription>
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
