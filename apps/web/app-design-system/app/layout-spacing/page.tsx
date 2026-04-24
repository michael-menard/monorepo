'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { DesignSystemNav } from '@/components/design-system-nav'

export default function LayoutSpacingPage() {
  return (
    <div className="min-h-screen bg-background transition-colors duration-300">
      <DesignSystemNav />

      <main className="max-w-6xl mx-auto px-6 py-12 space-y-16">
        <section className="space-y-8">
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Layout & Spacing</h2>
            <p className="text-muted-foreground">Spacing scale, containers, and grid patterns.</p>
          </div>

          {/* Spacing Scale */}
          <Card>
            <CardHeader>
              <CardTitle>Spacing Scale</CardTitle>
              <CardDescription>
                Consistent spacing using Tailwind&apos;s default scale (base unit: 4px).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                {[
                  { name: '0.5', value: '2px', cls: 'w-0.5' },
                  { name: '1', value: '4px', cls: 'w-1' },
                  { name: '2', value: '8px', cls: 'w-2' },
                  { name: '3', value: '12px', cls: 'w-3' },
                  { name: '4', value: '16px', cls: 'w-4' },
                  { name: '6', value: '24px', cls: 'w-6' },
                  { name: '8', value: '32px', cls: 'w-8' },
                  { name: '12', value: '48px', cls: 'w-12' },
                  { name: '16', value: '64px', cls: 'w-16' },
                  { name: '24', value: '96px', cls: 'w-24' },
                ].map(space => (
                  <div key={space.name} className="flex items-center gap-4">
                    <span className="text-xs font-mono text-muted-foreground w-16">
                      {space.value}
                    </span>
                    <div className={`h-4 bg-primary rounded ${space.cls}`} />
                    <span className="text-xs font-mono text-foreground">
                      gap-{space.name}, p-{space.name}, m-{space.name}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Container Widths */}
          <Card>
            <CardHeader>
              <CardTitle>Container Widths</CardTitle>
              <CardDescription>Max-width constraints for content areas.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { name: 'max-w-sm', value: '384px', desc: 'Small forms, sidebars' },
                { name: 'max-w-md', value: '448px', desc: 'Modals, narrow content' },
                { name: 'max-w-lg', value: '512px', desc: 'Cards, medium content' },
                { name: 'max-w-xl', value: '576px', desc: 'Wide cards' },
                { name: 'max-w-2xl', value: '672px', desc: 'Article content' },
                { name: 'max-w-4xl', value: '896px', desc: 'Main content area' },
                { name: 'max-w-6xl', value: '1152px', desc: 'Wide layouts' },
                { name: 'max-w-7xl', value: '1280px', desc: 'Full page container' },
              ].map(container => (
                <div key={container.name} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-mono text-foreground">{container.name}</span>
                    <span className="text-xs text-muted-foreground">{container.value}</span>
                  </div>
                  <div className="relative h-3 bg-muted rounded-full overflow-hidden">
                    <div
                      className="absolute inset-y-0 left-0 bg-primary/60 rounded-full"
                      style={{ width: `${(parseInt(container.value) / 1280) * 100}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">{container.desc}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Breakpoints */}
          <Card>
            <CardHeader>
              <CardTitle>Breakpoints</CardTitle>
              <CardDescription>Responsive design breakpoints.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {[
                  { name: 'sm', value: '640px', desc: 'Mobile landscape' },
                  { name: 'md', value: '768px', desc: 'Tablet' },
                  { name: 'lg', value: '1024px', desc: 'Desktop' },
                  { name: 'xl', value: '1280px', desc: 'Large desktop' },
                  { name: '2xl', value: '1536px', desc: 'Wide screens' },
                ].map(bp => (
                  <div key={bp.name} className="p-3 bg-muted rounded-lg text-center">
                    <p className="text-lg font-bold text-primary">{bp.name}:</p>
                    <p className="text-sm font-mono text-foreground">{bp.value}</p>
                    <p className="text-xs text-muted-foreground mt-1">{bp.desc}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Grid Patterns */}
          <Card>
            <CardHeader>
              <CardTitle>Grid Patterns</CardTitle>
              <CardDescription>Common grid layouts for different use cases.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">2-Column Grid</p>
                <p className="text-xs font-mono text-muted-foreground mb-2">
                  grid grid-cols-1 md:grid-cols-2 gap-4
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[1, 2].map(i => (
                    <div
                      key={i}
                      className="h-16 bg-primary/20 border-2 border-dashed border-primary/40 rounded-lg flex items-center justify-center"
                    >
                      <span className="text-sm text-primary font-medium">Column {i}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">3-Column Grid</p>
                <p className="text-xs font-mono text-muted-foreground mb-2">
                  grid grid-cols-1 md:grid-cols-3 gap-4
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[1, 2, 3].map(i => (
                    <div
                      key={i}
                      className="h-16 bg-accent/20 border-2 border-dashed border-accent/40 rounded-lg flex items-center justify-center"
                    >
                      <span className="text-sm text-foreground font-medium">Column {i}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">4-Column Grid</p>
                <p className="text-xs font-mono text-muted-foreground mb-2">
                  grid grid-cols-2 md:grid-cols-4 gap-4
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[1, 2, 3, 4].map(i => (
                    <div
                      key={i}
                      className="h-16 bg-chart-3/20 border-2 border-dashed border-chart-3/40 rounded-lg flex items-center justify-center"
                    >
                      <span className="text-sm text-foreground font-medium">Col {i}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Sidebar Layout</p>
                <p className="text-xs font-mono text-muted-foreground mb-2">
                  grid grid-cols-1 md:grid-cols-[280px_1fr] gap-6
                </p>
                <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-6">
                  <div className="h-24 bg-secondary border-2 border-dashed border-border rounded-lg flex items-center justify-center">
                    <span className="text-sm text-muted-foreground font-medium">
                      Sidebar (280px)
                    </span>
                  </div>
                  <div className="h-24 bg-primary/20 border-2 border-dashed border-primary/40 rounded-lg flex items-center justify-center">
                    <span className="text-sm text-primary font-medium">Main Content (1fr)</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Auto-fit Responsive Grid</p>
                <p className="text-xs font-mono text-muted-foreground mb-2">
                  grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4
                </p>
                <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div
                      key={i}
                      className="h-20 bg-destructive/20 border-2 border-dashed border-destructive/40 rounded-lg flex items-center justify-center"
                    >
                      <span className="text-sm text-foreground font-medium">Item {i}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        <footer className="border-t border-border pt-8">
          <p className="text-center text-sm text-muted-foreground">Dark Academia Design System</p>
        </footer>
      </main>
    </div>
  )
}
