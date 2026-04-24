'use client'

import { Card, CardContent } from '@/components/ui/card'
import { DesignSystemNav } from '@/components/design-system-nav'

const colorTokens = {
  core: [
    { name: 'background', desc: 'Page background' },
    { name: 'foreground', desc: 'Primary text' },
    { name: 'card', desc: 'Card surfaces' },
    { name: 'card-foreground', desc: 'Card text' },
  ],
  semantic: [
    { name: 'primary', desc: 'Primary actions & links' },
    { name: 'primary-foreground', desc: 'Text on primary' },
    { name: 'secondary', desc: 'Secondary surfaces' },
    { name: 'secondary-foreground', desc: 'Secondary text' },
    { name: 'muted', desc: 'Muted backgrounds' },
    { name: 'muted-foreground', desc: 'Muted text' },
    { name: 'accent', desc: 'Accent highlights' },
    { name: 'accent-foreground', desc: 'Accent text' },
    { name: 'destructive', desc: 'Destructive actions' },
    { name: 'destructive-foreground', desc: 'Destructive text' },
  ],
  ui: [
    { name: 'border', desc: 'Borders & dividers' },
    { name: 'input', desc: 'Input backgrounds' },
    { name: 'ring', desc: 'Focus rings' },
  ],
  charts: [
    { name: 'chart-1', desc: 'Chart color 1' },
    { name: 'chart-2', desc: 'Chart color 2' },
    { name: 'chart-3', desc: 'Chart color 3' },
    { name: 'chart-4', desc: 'Chart color 4' },
    { name: 'chart-5', desc: 'Chart color 5' },
  ],
}

export default function ColorsPage() {
  return (
    <div className="min-h-screen bg-background transition-colors duration-300">
      <DesignSystemNav />

      <main className="max-w-6xl mx-auto px-6 py-12 space-y-16">
        {/* Color Palette */}
        <section className="space-y-8">
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Color Palette</h2>
            <p className="text-muted-foreground">
              Design tokens that adapt to light and dark themes.
            </p>
          </div>

          {/* Core Colors */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Core Colors</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {colorTokens.core.map(token => (
                <div key={token.name} className="space-y-2">
                  <div
                    className={`h-20 rounded-lg border border-border ${
                      token.name.includes('foreground') ? 'flex items-center justify-center' : ''
                    }`}
                    style={{ backgroundColor: `var(--${token.name})` }}
                  >
                    {token.name.includes('foreground') && (
                      <span className="text-xs text-background font-medium">Aa</span>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{token.name}</p>
                    <p className="text-xs text-muted-foreground">{token.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Semantic Colors */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Semantic Colors</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {colorTokens.semantic.map(token => (
                <div key={token.name} className="space-y-2">
                  <div
                    className="h-16 rounded-lg border border-border flex items-center justify-center"
                    style={{ backgroundColor: `var(--${token.name})` }}
                  >
                    {token.name.includes('foreground') && (
                      <span
                        className="text-xs font-medium"
                        style={{ color: `var(--${token.name.replace('-foreground', '')})` }}
                      >
                        Aa
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-medium text-foreground">{token.name}</p>
                    <p className="text-xs text-muted-foreground">{token.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Chart Colors */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Chart Colors</h3>
            <div className="flex gap-2">
              {colorTokens.charts.map((token, i) => (
                <div key={token.name} className="flex-1 space-y-2">
                  <div
                    className="h-24 rounded-lg first:rounded-l-xl last:rounded-r-xl"
                    style={{ backgroundColor: `var(--${token.name})` }}
                  />
                  <p className="text-xs text-center text-muted-foreground">{i + 1}</p>
                </div>
              ))}
            </div>
          </div>

          {/* UI Colors */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">UI Colors</h3>
            <div className="grid grid-cols-3 gap-4">
              {colorTokens.ui.map(token => (
                <div key={token.name} className="space-y-2">
                  <div
                    className="h-12 rounded-lg border-2"
                    style={{
                      backgroundColor: `var(--${token.name})`,
                      borderColor: token.name === 'border' ? `var(--${token.name})` : 'transparent',
                    }}
                  />
                  <div>
                    <p className="text-sm font-medium text-foreground">{token.name}</p>
                    <p className="text-xs text-muted-foreground">{token.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Gradients */}
        <section className="space-y-8">
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Gradients</h2>
            <p className="text-muted-foreground">
              Linear and radial gradients using the color palette.
            </p>
          </div>

          {/* 1-Color Gradients */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">1-Color Gradients</h3>
            <p className="text-sm text-muted-foreground">
              Solid to transparent fades for overlays and vignettes.
            </p>

            <p className="text-xs font-medium text-foreground uppercase tracking-wide">Standard</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <div
                  className="h-24 rounded-lg border border-border"
                  style={{ background: 'linear-gradient(to right, var(--primary), transparent)' }}
                />
                <p className="text-xs text-muted-foreground">Linear: Primary fade right</p>
              </div>
              <div className="space-y-2">
                <div
                  className="h-24 rounded-lg border border-border"
                  style={{ background: 'linear-gradient(to bottom, var(--accent), transparent)' }}
                />
                <p className="text-xs text-muted-foreground">Linear: Accent fade down</p>
              </div>
              <div className="space-y-2">
                <div
                  className="h-24 rounded-lg border border-border"
                  style={{
                    background: 'radial-gradient(circle at center, var(--primary), transparent)',
                  }}
                />
                <p className="text-xs text-muted-foreground">Radial: Primary glow out</p>
              </div>
              <div className="space-y-2">
                <div
                  className="h-24 rounded-lg border border-border"
                  style={{
                    background:
                      'radial-gradient(circle at center, var(--destructive), transparent)',
                  }}
                />
                <p className="text-xs text-muted-foreground">Radial: Destructive glow out</p>
              </div>
            </div>

            <p className="text-xs font-medium text-foreground uppercase tracking-wide pt-4">
              Inverted
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <div
                  className="h-24 rounded-lg border border-border"
                  style={{ background: 'linear-gradient(to left, var(--primary), transparent)' }}
                />
                <p className="text-xs text-muted-foreground">Linear: Primary fade left</p>
              </div>
              <div className="space-y-2">
                <div
                  className="h-24 rounded-lg border border-border"
                  style={{ background: 'linear-gradient(to top, var(--accent), transparent)' }}
                />
                <p className="text-xs text-muted-foreground">Linear: Accent fade up</p>
              </div>
              <div className="space-y-2">
                <div
                  className="h-24 rounded-lg"
                  style={{
                    background: 'radial-gradient(circle at center, transparent, var(--primary))',
                  }}
                />
                <p className="text-xs text-muted-foreground">Radial: Primary glow in</p>
              </div>
              <div className="space-y-2">
                <div
                  className="h-24 rounded-lg"
                  style={{
                    background:
                      'radial-gradient(circle at center, transparent, var(--destructive))',
                  }}
                />
                <p className="text-xs text-muted-foreground">Radial: Destructive glow in</p>
              </div>
            </div>
          </div>

          {/* 2-Color Gradients */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">2-Color Gradients</h3>
            <p className="text-sm text-muted-foreground">
              Harmonious two-tone gradients for backgrounds and accents.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <div
                  className="h-24 rounded-lg"
                  style={{ background: 'linear-gradient(135deg, var(--primary), var(--chart-5))' }}
                />
                <p className="text-xs text-muted-foreground">Primary to Sage</p>
              </div>
              <div className="space-y-2">
                <div
                  className="h-24 rounded-lg"
                  style={{
                    background: 'linear-gradient(to right, var(--chart-3), var(--destructive))',
                  }}
                />
                <p className="text-xs text-muted-foreground">Gold to Burgundy</p>
              </div>
              <div className="space-y-2">
                <div
                  className="h-24 rounded-lg"
                  style={{
                    background:
                      'radial-gradient(circle at 30% 30%, var(--primary), var(--chart-4))',
                  }}
                />
                <p className="text-xs text-muted-foreground">Radial: Green to Taupe</p>
              </div>
              <div className="space-y-2">
                <div
                  className="h-24 rounded-lg"
                  style={{
                    background:
                      'radial-gradient(ellipse at top, var(--chart-3), var(--background))',
                  }}
                />
                <p className="text-xs text-muted-foreground">Radial: Gold vignette</p>
              </div>
            </div>
          </div>

          {/* 3-Color Gradients */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">3-Color Gradients</h3>
            <p className="text-sm text-muted-foreground">
              Rich multi-stop gradients for hero sections and feature backgrounds.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div
                  className="h-32 rounded-lg"
                  style={{
                    background:
                      'linear-gradient(135deg, var(--primary) 0%, var(--chart-5) 50%, var(--accent) 100%)',
                  }}
                />
                <p className="text-xs text-muted-foreground">Olive - Sage - Accent</p>
              </div>
              <div className="space-y-2">
                <div
                  className="h-32 rounded-lg"
                  style={{
                    background:
                      'linear-gradient(to right, var(--chart-4), var(--chart-3), var(--destructive))',
                  }}
                />
                <p className="text-xs text-muted-foreground">Taupe - Gold - Burgundy</p>
              </div>
              <div className="space-y-2">
                <div
                  className="h-32 rounded-lg"
                  style={{
                    background:
                      'radial-gradient(circle at center, var(--chart-3) 0%, var(--destructive) 50%, var(--chart-4) 100%)',
                  }}
                />
                <p className="text-xs text-muted-foreground">Radial: Gold - Burgundy - Taupe</p>
              </div>
              <div className="space-y-2">
                <div
                  className="h-32 rounded-lg"
                  style={{
                    background:
                      'radial-gradient(ellipse at top left, var(--primary) 0%, var(--accent) 40%, var(--background) 100%)',
                  }}
                />
                <p className="text-xs text-muted-foreground">Radial: Olive - Sage - Background</p>
              </div>
            </div>
          </div>

          {/* Mesh Gradients */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Mesh Gradients</h3>
            <p className="text-sm text-muted-foreground">
              Multiple overlapping radial gradients for organic, fluid backgrounds.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div
                  className="h-40 rounded-lg"
                  style={{
                    background: `radial-gradient(circle at 20% 30%, var(--primary) 0%, transparent 50%), radial-gradient(circle at 80% 70%, var(--accent) 0%, transparent 50%), var(--background)`,
                  }}
                />
                <p className="text-xs text-muted-foreground">2-point mesh: Primary + Accent</p>
              </div>
              <div className="space-y-2">
                <div
                  className="h-40 rounded-lg"
                  style={{
                    background: `radial-gradient(circle at 10% 20%, var(--chart-3) 0%, transparent 40%), radial-gradient(circle at 90% 30%, var(--primary) 0%, transparent 45%), radial-gradient(circle at 50% 80%, var(--destructive) 0%, transparent 40%), var(--card)`,
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  3-point mesh: Gold + Olive + Burgundy
                </p>
              </div>
              <div className="space-y-2">
                <div
                  className="h-40 rounded-lg"
                  style={{
                    background: `radial-gradient(ellipse at 0% 0%, var(--primary) 0%, transparent 50%), radial-gradient(ellipse at 100% 100%, var(--chart-5) 0%, transparent 50%), var(--secondary)`,
                  }}
                />
                <p className="text-xs text-muted-foreground">Corner mesh: Diagonal flow</p>
              </div>
              <div className="space-y-2">
                <div
                  className="h-40 rounded-lg"
                  style={{
                    background: `radial-gradient(circle at 25% 25%, var(--chart-3) 0%, transparent 35%), radial-gradient(circle at 75% 25%, var(--primary) 0%, transparent 35%), radial-gradient(circle at 25% 75%, var(--chart-5) 0%, transparent 35%), radial-gradient(circle at 75% 75%, var(--destructive) 0%, transparent 35%), var(--muted)`,
                  }}
                />
                <p className="text-xs text-muted-foreground">4-point mesh: Quad corners</p>
              </div>
              <div className="space-y-2">
                <div
                  className="h-40 rounded-lg"
                  style={{
                    background: `radial-gradient(ellipse 80% 50% at 20% 50%, var(--primary) 0%, transparent 70%), radial-gradient(ellipse 80% 50% at 80% 50%, var(--accent) 0%, transparent 70%), var(--background)`,
                  }}
                />
                <p className="text-xs text-muted-foreground">Horizontal blend: Soft overlap</p>
              </div>
              <div className="space-y-2">
                <div
                  className="h-40 rounded-lg"
                  style={{
                    background: `radial-gradient(circle at 50% 0%, var(--chart-3) 0%, transparent 60%), radial-gradient(circle at 0% 100%, var(--primary) 0%, transparent 50%), radial-gradient(circle at 100% 100%, var(--destructive) 0%, transparent 50%), var(--card)`,
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  Hero mesh: Top glow + corner accents
                </p>
              </div>
            </div>
          </div>

          {/* Gradient Borders */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Gradient Borders</h3>
            <p className="text-sm text-muted-foreground">
              Gradient effects applied to borders for elegant card and button styling.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <div
                  className="h-32 rounded-lg p-[2px]"
                  style={{ background: 'linear-gradient(135deg, var(--primary), var(--chart-5))' }}
                >
                  <div className="h-full w-full rounded-[6px] bg-card flex items-center justify-center">
                    <p className="text-sm text-foreground">Linear border</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">135deg: Primary to Sage</p>
              </div>
              <div className="space-y-2">
                <div
                  className="h-32 rounded-lg p-[2px]"
                  style={{
                    background: 'linear-gradient(to right, var(--chart-3), var(--destructive))',
                  }}
                >
                  <div className="h-full w-full rounded-[6px] bg-card flex items-center justify-center">
                    <p className="text-sm text-foreground">Horizontal border</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">Left to right: Gold to Burgundy</p>
              </div>
              <div className="space-y-2">
                <div
                  className="h-32 rounded-full p-[2px]"
                  style={{
                    background:
                      'conic-gradient(from 0deg, var(--primary), var(--chart-3), var(--destructive), var(--chart-5), var(--primary))',
                  }}
                >
                  <div className="h-full w-full rounded-full bg-card flex items-center justify-center">
                    <p className="text-sm text-foreground">Conic border</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">Full spectrum rotation</p>
              </div>
            </div>

            <p className="text-xs font-medium text-foreground uppercase tracking-wide pt-4">
              Buttons with Gradient Borders
            </p>
            <div className="flex flex-wrap gap-4">
              <div
                className="rounded-md p-[1.5px]"
                style={{ background: 'linear-gradient(135deg, var(--primary), var(--chart-5))' }}
              >
                <button className="px-4 py-2 rounded-[5px] bg-card text-foreground text-sm font-medium hover:bg-muted transition-colors">
                  Gradient Button
                </button>
              </div>
              <div
                className="rounded-md p-[1.5px]"
                style={{
                  background: 'linear-gradient(to right, var(--chart-3), var(--destructive))',
                }}
              >
                <button className="px-4 py-2 rounded-[5px] bg-card text-foreground text-sm font-medium hover:bg-muted transition-colors">
                  Warm Gradient
                </button>
              </div>
              <div
                className="rounded-full p-[1.5px]"
                style={{
                  background:
                    'conic-gradient(from 0deg, var(--primary), var(--chart-3), var(--destructive), var(--primary))',
                }}
              >
                <button className="px-4 py-2 rounded-full bg-card text-foreground text-sm font-medium hover:bg-muted transition-colors">
                  Conic Pill
                </button>
              </div>
            </div>
          </div>

          {/* Gradient Usage Examples */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Usage Examples</h3>
            <div className="grid md:grid-cols-3 gap-4">
              <div
                className="h-40 rounded-lg p-6 flex flex-col justify-end"
                style={{
                  background: 'linear-gradient(to top, var(--foreground) 0%, transparent 100%)',
                }}
              >
                <p className="text-sm font-medium text-background">Image overlay</p>
                <p className="text-xs text-background/70">For text on images</p>
              </div>
              <div
                className="h-40 rounded-lg p-6 flex items-center justify-center"
                style={{
                  background:
                    'radial-gradient(circle at 50% 50%, var(--primary) 0%, var(--primary) 30%, transparent 70%)',
                }}
              >
                <p className="text-sm font-medium text-primary-foreground">Spotlight effect</p>
              </div>
              <div
                className="h-40 rounded-lg border border-border overflow-hidden relative"
                style={{ background: 'var(--card)' }}
              >
                <div
                  className="absolute inset-0"
                  style={{
                    background:
                      'radial-gradient(ellipse at top right, var(--accent) 0%, transparent 50%)',
                  }}
                />
                <div className="relative p-6">
                  <p className="text-sm font-medium text-foreground">Corner accent</p>
                  <p className="text-xs text-muted-foreground">Subtle card highlight</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CSS Variables Reference */}
        <section className="space-y-8">
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-2">CSS Variables</h2>
            <p className="text-muted-foreground">Reference for implementing the theme.</p>
          </div>

          <Card>
            <CardContent className="pt-6">
              <pre className="text-xs font-mono bg-muted p-4 rounded-lg overflow-x-auto text-foreground">
                {`:root {
  /* Light Dark Academia */
  --background: oklch(0.95 0.015 85);    /* warm cream */
  --foreground: oklch(0.28 0.015 130);   /* charcoal-olive */
  --primary: oklch(0.52 0.045 135);      /* olive green */
  --secondary: oklch(0.85 0.02 80);      /* sand beige */
  --accent: oklch(0.72 0.04 140);        /* soft sage */
  --destructive: oklch(0.55 0.12 25);    /* burgundy */
}

.dark {
  /* Dark Academia */
  --background: oklch(0.22 0.015 60);    /* Iron Ore charcoal */
  --foreground: oklch(0.92 0.015 85);    /* parchment cream */
  --primary: oklch(0.45 0.08 160);       /* Hunt Club green */
  --secondary: oklch(0.32 0.02 55);      /* Urbane Bronze */
  --accent: oklch(0.45 0.12 25);         /* Dark Auburn */
  --destructive: oklch(0.50 0.14 25);    /* deep burgundy */
}`}
              </pre>
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
