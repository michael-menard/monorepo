'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { DesignSystemNav } from '@/components/design-system-nav'

export default function TypographyPage() {
  return (
    <div className="min-h-screen bg-background transition-colors duration-300">
      <DesignSystemNav />

      <main className="max-w-6xl mx-auto px-6 py-12 space-y-16">
        {/* Font System (Dark Academia) */}
        <section className="space-y-8">
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Typography</h2>
            <p className="text-muted-foreground">
              Leather-Bound Encyclopedia: Cormorant Garamond + Lora + Geist Mono.
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="font-heading">Font System</CardTitle>
              <CardDescription>
                Three fonts for a professional, cozy, bookerly aesthetic.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-heading font-bold">Font</TableHead>
                    <TableHead className="font-heading font-bold">Class</TableHead>
                    <TableHead className="font-heading font-bold">Use For</TableHead>
                    <TableHead className="font-heading font-bold">Example</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-body">Cormorant Garamond</TableCell>
                    <TableCell className="font-mono text-xs">font-heading</TableCell>
                    <TableCell className="font-body">Headings, titles, display text</TableCell>
                    <TableCell className="font-heading text-lg">Castle Keep</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-body">Lora</TableCell>
                    <TableCell className="font-mono text-xs">font-body</TableCell>
                    <TableCell className="font-body">Body text, descriptions, paragraphs</TableCell>
                    <TableCell className="font-body">Building instructions</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-body">Geist Mono</TableCell>
                    <TableCell className="font-mono text-xs">font-mono</TableCell>
                    <TableCell className="font-body">Numbers, codes, technical data</TableCell>
                    <TableCell className="font-mono">1,284 pcs &bull; #MOC-10305</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-heading">Type Scale</CardTitle>
              <CardDescription>Heading hierarchy with Cormorant Garamond.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <h1 className="text-4xl font-bold font-heading text-foreground">Heading 1</h1>
                <h2 className="text-3xl font-bold font-heading text-foreground">Heading 2</h2>
                <h3 className="text-2xl font-bold font-heading text-foreground">Heading 3</h3>
                <h4 className="text-xl font-bold font-heading text-foreground">Heading 4</h4>
                <p className="text-base font-body text-foreground">
                  Body text in Lora - warm, readable, distinctly bookish.
                </p>
                <p className="text-sm font-body text-muted-foreground">
                  Secondary text in Lora for descriptions and captions.
                </p>
                <p className="text-sm font-mono text-foreground">
                  1,284 pieces &bull; #10305 &bull; MOC-10847
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-heading">In Context: Card</CardTitle>
              <CardDescription>How the font system works in a typical card layout.</CardDescription>
            </CardHeader>
            <CardContent>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="font-heading">Medieval Market Square</CardTitle>
                  <CardDescription className="font-body">
                    A bustling marketplace with authentic period details
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm font-body text-foreground mb-4">
                    This detailed MOC recreates the vibrant atmosphere of a medieval marketplace,
                    complete with merchant stalls, cobblestone streets, and period-accurate
                    architecture.
                  </p>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground font-body">Pieces</span>
                      <span className="font-mono text-foreground">2,847</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground font-body">Theme</span>
                      <span className="font-body text-foreground">Castle & Medieval</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground font-body">Part #</span>
                      <span className="font-mono text-foreground">MOC-10847</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-heading">In Context: Table</CardTitle>
              <CardDescription>
                Readability with dense data using Cormorant headers and Lora body.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-heading font-bold">MOC Name</TableHead>
                    <TableHead className="font-heading font-bold">Theme</TableHead>
                    <TableHead className="font-heading font-bold text-right">Pieces</TableHead>
                    <TableHead className="font-heading font-bold text-right">Part #</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-body font-medium">Castle Gatehouse</TableCell>
                    <TableCell className="font-body">Castle & Medieval</TableCell>
                    <TableCell className="text-right font-mono">1,284</TableCell>
                    <TableCell className="text-right font-mono">MOC-10305</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-body font-medium">Victorian Train Station</TableCell>
                    <TableCell className="font-body">City & Modular</TableCell>
                    <TableCell className="text-right font-mono">3,456</TableCell>
                    <TableCell className="text-right font-mono">MOC-10412</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-body font-medium">
                      Enchanted Forest Hideaway
                    </TableCell>
                    <TableCell className="font-body">Nature</TableCell>
                    <TableCell className="text-right font-mono">892</TableCell>
                    <TableCell className="text-right font-mono">MOC-10287</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-heading">Body Text Sample</CardTitle>
              <CardDescription>Lora in longer paragraphs for readability.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 font-body text-foreground leading-relaxed">
                <p>
                  The medieval castle keep stands as a testament to centuries of architectural
                  innovation. Its thick stone walls, measuring over three meters at the base, were
                  designed to withstand siege warfare. The narrow windows, called arrow loops,
                  allowed defenders to fire upon attackers while remaining protected.
                </p>
                <p>
                  Inside, the great hall served as the heart of castle life, where lords held court
                  and feasts were celebrated. The high ceilings and large fireplaces created a space
                  that was both impressive and practical for heating during harsh winters.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-heading">Spacing & Layout System</CardTitle>
              <CardDescription>
                Standard gaps, padding, and text sizes per breakpoint. Default line-height is 1.6.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-heading font-bold">Element</TableHead>
                    <TableHead className="font-heading font-bold">Mobile</TableHead>
                    <TableHead className="font-heading font-bold">Tablet (md)</TableHead>
                    <TableHead className="font-heading font-bold">Desktop (lg)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-body font-medium">Layout Gap</TableCell>
                    <TableCell className="font-mono text-xs">gap-4 (16px)</TableCell>
                    <TableCell className="font-mono text-xs">gap-6 (24px)</TableCell>
                    <TableCell className="font-mono text-xs">gap-8 (32px)</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-body font-medium">Container Padding</TableCell>
                    <TableCell className="font-mono text-xs">px-4 (16px)</TableCell>
                    <TableCell className="font-mono text-xs">px-6 (24px)</TableCell>
                    <TableCell className="font-mono text-xs">px-8 (32px)</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-body font-medium">Section Spacing</TableCell>
                    <TableCell className="font-mono text-xs">py-12 (48px)</TableCell>
                    <TableCell className="font-mono text-xs">py-16 (64px)</TableCell>
                    <TableCell className="font-mono text-xs">py-20 (80px)</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-body font-medium">Card Gap</TableCell>
                    <TableCell className="font-mono text-xs">gap-4 (16px)</TableCell>
                    <TableCell className="font-mono text-xs">gap-6 (24px)</TableCell>
                    <TableCell className="font-mono text-xs">gap-6 (24px)</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-body font-medium">Body Text</TableCell>
                    <TableCell className="font-mono text-xs">text-base (16px)</TableCell>
                    <TableCell className="font-mono text-xs">text-base (16px)</TableCell>
                    <TableCell className="font-mono text-xs">text-lg (18px)</TableCell>
                  </TableRow>
                </TableBody>
              </Table>

              <div className="space-y-4">
                <p className="text-xs font-medium text-primary uppercase tracking-wide">
                  Typography Scale
                </p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-heading font-bold">Heading</TableHead>
                      <TableHead className="font-heading font-bold">Mobile</TableHead>
                      <TableHead className="font-heading font-bold">Tablet (md)</TableHead>
                      <TableHead className="font-heading font-bold">Desktop (lg)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-body font-medium">H1</TableCell>
                      <TableCell className="font-mono text-xs">text-3xl (30px)</TableCell>
                      <TableCell className="font-mono text-xs">text-4xl (36px)</TableCell>
                      <TableCell className="font-mono text-xs">text-5xl (48px)</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-body font-medium">H2</TableCell>
                      <TableCell className="font-mono text-xs">text-2xl (24px)</TableCell>
                      <TableCell className="font-mono text-xs">text-3xl (30px)</TableCell>
                      <TableCell className="font-mono text-xs">text-4xl (36px)</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-body font-medium">H3</TableCell>
                      <TableCell className="font-mono text-xs">text-xl (20px)</TableCell>
                      <TableCell className="font-mono text-xs">text-2xl (24px)</TableCell>
                      <TableCell className="font-mono text-xs">text-2xl (24px)</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-body font-medium">H4</TableCell>
                      <TableCell className="font-mono text-xs">text-lg (18px)</TableCell>
                      <TableCell className="font-mono text-xs">text-xl (20px)</TableCell>
                      <TableCell className="font-mono text-xs">text-xl (20px)</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              <div className="space-y-4">
                <p className="text-xs font-medium text-primary uppercase tracking-wide">
                  Common Patterns
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 border border-border rounded-lg space-y-2">
                    <p className="font-body font-medium text-sm">Container</p>
                    <code className="text-xs font-mono text-muted-foreground block">
                      max-w-7xl mx-auto px-4 md:px-6 lg:px-8
                    </code>
                  </div>
                  <div className="p-4 border border-border rounded-lg space-y-2">
                    <p className="font-body font-medium text-sm">Section</p>
                    <code className="text-xs font-mono text-muted-foreground block">
                      py-12 md:py-16 lg:py-20
                    </code>
                  </div>
                  <div className="p-4 border border-border rounded-lg space-y-2">
                    <p className="font-body font-medium text-sm">Card Grid</p>
                    <code className="text-xs font-mono text-muted-foreground block">
                      grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6
                    </code>
                  </div>
                  <div className="p-4 border border-border rounded-lg space-y-2">
                    <p className="font-body font-medium text-sm">Line Height</p>
                    <code className="text-xs font-mono text-muted-foreground block">
                      leading-relaxed (1.625) for body text
                    </code>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Geist Sans Typography */}
        <section className="space-y-8">
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Geist Sans Scale</h2>
            <p className="text-muted-foreground">Font hierarchy using Geist Sans.</p>
          </div>

          <Card>
            <CardContent className="pt-6 space-y-6">
              <div className="space-y-4">
                <div className="flex items-baseline justify-between border-b border-border pb-4">
                  <h1 className="text-4xl font-bold text-foreground">Heading 1</h1>
                  <span className="text-xs text-muted-foreground font-mono">
                    text-4xl font-bold
                  </span>
                </div>
                <div className="flex items-baseline justify-between border-b border-border pb-4">
                  <h2 className="text-3xl font-bold text-foreground">Heading 2</h2>
                  <span className="text-xs text-muted-foreground font-mono">
                    text-3xl font-bold
                  </span>
                </div>
                <div className="flex items-baseline justify-between border-b border-border pb-4">
                  <h3 className="text-2xl font-semibold text-foreground">Heading 3</h3>
                  <span className="text-xs text-muted-foreground font-mono">
                    text-2xl font-semibold
                  </span>
                </div>
                <div className="flex items-baseline justify-between border-b border-border pb-4">
                  <h4 className="text-xl font-semibold text-foreground">Heading 4</h4>
                  <span className="text-xs text-muted-foreground font-mono">
                    text-xl font-semibold
                  </span>
                </div>
                <div className="flex items-baseline justify-between border-b border-border pb-4">
                  <p className="text-base text-foreground">
                    Body text - The quick brown fox jumps over the lazy dog.
                  </p>
                  <span className="text-xs text-muted-foreground font-mono">text-base</span>
                </div>
                <div className="flex items-baseline justify-between border-b border-border pb-4">
                  <p className="text-sm text-muted-foreground">
                    Small text - Secondary information and captions.
                  </p>
                  <span className="text-xs text-muted-foreground font-mono">
                    text-sm text-muted-foreground
                  </span>
                </div>
                <div className="flex items-baseline justify-between">
                  <code className="text-sm font-mono bg-muted px-2 py-1 rounded">Code snippet</code>
                  <span className="text-xs text-muted-foreground font-mono">
                    font-mono bg-muted
                  </span>
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
