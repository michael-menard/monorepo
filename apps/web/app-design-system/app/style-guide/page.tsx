'use client'

import {
  BookOpen,
  Feather,
  Library,
  GraduationCap,
  Clock,
  Star,
  Heart,
  ChevronRight,
} from 'lucide-react'
import { DesignSystemNav } from '@/components/design-system-nav'

export default function StyleGuide() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <DesignSystemNav />

      <main className="mx-auto max-w-6xl px-6 py-12">
        {/* Introduction */}
        <section className="mb-16">
          <h2 className="mb-4 font-serif text-3xl font-bold text-foreground">
            Dark Academia Design System
          </h2>
          <p className="max-w-2xl text-balance leading-relaxed text-muted-foreground">
            A cohesive design system inspired by classical literature, vintage libraries, and
            scholarly aesthetics. This style guide documents the color palette, typography, and
            component patterns for both light and dark themes.
          </p>
        </section>

        {/* Color Palette */}
        <section className="mb-16">
          <h3 className="mb-6 font-serif text-2xl font-semibold">Color Palette</h3>

          {/* Core Colors */}
          <div className="mb-8">
            <h4 className="mb-4 text-sm font-medium uppercase tracking-wide text-muted-foreground">
              Core Colors
            </h4>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <ColorSwatch
                name="Background"
                variable="bg-background"
                description="Page background"
              />
              <ColorSwatch name="Foreground" variable="bg-foreground" description="Primary text" />
              <ColorSwatch name="Card" variable="bg-card" description="Card surfaces" />
              <ColorSwatch name="Border" variable="bg-border" description="Borders & dividers" />
            </div>
          </div>

          {/* Semantic Colors */}
          <div className="mb-8">
            <h4 className="mb-4 text-sm font-medium uppercase tracking-wide text-muted-foreground">
              Semantic Colors
            </h4>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <ColorSwatch
                name="Primary"
                variable="bg-primary"
                description="Primary actions, links"
              />
              <ColorSwatch
                name="Secondary"
                variable="bg-secondary"
                description="Secondary surfaces"
              />
              <ColorSwatch name="Muted" variable="bg-muted" description="Muted backgrounds" />
              <ColorSwatch name="Accent" variable="bg-accent" description="Accent highlights" />
            </div>
          </div>

          {/* Chart Colors */}
          <div>
            <h4 className="mb-4 text-sm font-medium uppercase tracking-wide text-muted-foreground">
              Chart Colors
            </h4>
            <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
              <ColorSwatch name="Chart 1" variable="bg-chart-1" description="Primary data" small />
              <ColorSwatch
                name="Chart 2"
                variable="bg-chart-2"
                description="Secondary data"
                small
              />
              <ColorSwatch name="Chart 3" variable="bg-chart-3" description="Tertiary data" small />
              <ColorSwatch
                name="Chart 4"
                variable="bg-chart-4"
                description="Quaternary data"
                small
              />
              <ColorSwatch name="Chart 5" variable="bg-chart-5" description="Quinary data" small />
            </div>
          </div>
        </section>

        {/* Typography */}
        <section className="mb-16">
          <h3 className="mb-6 font-serif text-2xl font-semibold">Typography</h3>
          <div className="rounded-lg border border-border bg-card p-8">
            <div className="space-y-6">
              <div>
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Display
                </span>
                <p className="font-serif text-5xl font-bold">The Art of Learning</p>
              </div>
              <div>
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Heading 1
                </span>
                <p className="font-serif text-4xl font-semibold">Classical Literature</p>
              </div>
              <div>
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Heading 2
                </span>
                <p className="font-serif text-3xl font-semibold">Philosophy & Thought</p>
              </div>
              <div>
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Heading 3
                </span>
                <p className="font-serif text-2xl font-semibold">Ancient History</p>
              </div>
              <div>
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Body Large
                </span>
                <p className="text-lg leading-relaxed">
                  Knowledge is the foundation upon which wisdom is built. In the quiet corners of
                  old libraries, we find the accumulated wisdom of centuries.
                </p>
              </div>
              <div>
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Body
                </span>
                <p className="leading-relaxed text-foreground">
                  The pursuit of knowledge is a noble endeavor. Through careful study and
                  contemplation, we come to understand not only the world around us but also
                  ourselves.
                </p>
              </div>
              <div>
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Small / Caption
                </span>
                <p className="text-sm text-muted-foreground">
                  Last updated: April 24, 2026 - Style Guide v1.0
                </p>
              </div>
              <div>
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Monospace
                </span>
                <p className="font-mono text-sm">const wisdom = knowledge + experience;</p>
              </div>
            </div>
          </div>
        </section>

        {/* Buttons */}
        <section className="mb-16">
          <h3 className="mb-6 font-serif text-2xl font-semibold">Buttons</h3>
          <div className="rounded-lg border border-border bg-card p-8">
            <div className="flex flex-wrap items-center gap-4">
              <button className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
                Primary
              </button>
              <button className="rounded-md border border-border bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground transition-colors hover:bg-muted">
                Secondary
              </button>
              <button className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent/90">
                Accent
              </button>
              <button className="rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground transition-colors hover:bg-destructive/90">
                Destructive
              </button>
              <button className="rounded-md px-4 py-2 text-sm font-medium text-primary underline-offset-4 hover:underline">
                Link
              </button>
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-4">
              <button className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
                <BookOpen className="h-4 w-4" />
                With Icon
              </button>
              <button className="flex items-center gap-2 rounded-md border border-border bg-card px-4 py-2 text-sm font-medium text-card-foreground">
                Continue
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </section>

        {/* Cards */}
        <section className="mb-16">
          <h3 className="mb-6 font-serif text-2xl font-semibold">Cards</h3>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Basic Card */}
            <div className="rounded-lg border border-border bg-card p-6">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
                <Feather className="h-5 w-5 text-primary" />
              </div>
              <h4 className="mb-2 font-serif text-lg font-semibold text-card-foreground">
                Poetry Collection
              </h4>
              <p className="text-sm leading-relaxed text-muted-foreground">
                A curated selection of classical poetry from the Romantic era.
              </p>
            </div>

            {/* Card with Stats */}
            <div className="rounded-lg border border-border bg-card p-6">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-md bg-accent/30">
                <Library className="h-5 w-5 text-accent-foreground" />
              </div>
              <h4 className="mb-2 font-serif text-lg font-semibold text-card-foreground">
                Library Archive
              </h4>
              <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
                Access to rare manuscripts and historical documents.
              </p>
              <div className="flex gap-4 text-sm">
                <span className="text-muted-foreground">
                  <strong className="text-card-foreground">2,847</strong> items
                </span>
                <span className="text-muted-foreground">
                  <strong className="text-card-foreground">156</strong> collections
                </span>
              </div>
            </div>

            {/* Card with Action */}
            <div className="rounded-lg border border-border bg-card p-6">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-md bg-secondary">
                <GraduationCap className="h-5 w-5 text-secondary-foreground" />
              </div>
              <h4 className="mb-2 font-serif text-lg font-semibold text-card-foreground">
                Study Sessions
              </h4>
              <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
                Join guided study sessions with fellow scholars.
              </p>
              <button className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
                Join Session
              </button>
            </div>
          </div>
        </section>

        {/* Form Elements */}
        <section className="mb-16">
          <h3 className="mb-6 font-serif text-2xl font-semibold">Form Elements</h3>
          <div className="rounded-lg border border-border bg-card p-8">
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">Text Input</label>
                <input
                  type="text"
                  placeholder="Enter your name"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">Select</label>
                <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20">
                  <option>Philosophy</option>
                  <option>Literature</option>
                  <option>History</option>
                  <option>Art History</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-foreground">Textarea</label>
                <textarea
                  rows={3}
                  placeholder="Write your thoughts..."
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Badges & Tags */}
        <section className="mb-16">
          <h3 className="mb-6 font-serif text-2xl font-semibold">Badges & Tags</h3>
          <div className="rounded-lg border border-border bg-card p-8">
            <div className="flex flex-wrap gap-3">
              <span className="rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
                Primary
              </span>
              <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
                Secondary
              </span>
              <span className="rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">
                Accent
              </span>
              <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                Muted
              </span>
              <span className="rounded-full border border-border px-3 py-1 text-xs font-medium text-foreground">
                Outline
              </span>
              <span className="rounded-full bg-destructive px-3 py-1 text-xs font-medium text-destructive-foreground">
                Destructive
              </span>
            </div>
          </div>
        </section>

        {/* Sample List */}
        <section className="mb-16">
          <h3 className="mb-6 font-serif text-2xl font-semibold">List Items</h3>
          <div className="rounded-lg border border-border bg-card">
            {[
              {
                icon: BookOpen,
                title: 'The Great Gatsby',
                subtitle: 'F. Scott Fitzgerald',
                meta: '1925',
              },
              {
                icon: Feather,
                title: 'Pride and Prejudice',
                subtitle: 'Jane Austen',
                meta: '1813',
              },
              { icon: Library, title: 'Wuthering Heights', subtitle: 'Emily Bronte', meta: '1847' },
            ].map((item, index) => (
              <div
                key={index}
                className={`flex items-center gap-4 p-4 ${index !== 2 ? 'border-b border-border' : ''}`}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-secondary">
                  <item.icon className="h-5 w-5 text-secondary-foreground" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-card-foreground">{item.title}</p>
                  <p className="text-sm text-muted-foreground">{item.subtitle}</p>
                </div>
                <span className="text-sm text-muted-foreground">{item.meta}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Stats */}
        <section className="mb-16">
          <h3 className="mb-6 font-serif text-2xl font-semibold">Stats & Metrics</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: BookOpen, value: '2,847', label: 'Books Read', color: 'text-primary' },
              { icon: Clock, value: '1,423', label: 'Study Hours', color: 'text-primary' },
              { icon: Star, value: '892', label: 'Favorites', color: 'text-primary' },
              { icon: Heart, value: '156', label: 'Collections', color: 'text-primary' },
            ].map((stat, index) => (
              <div key={index} className="rounded-lg border border-border bg-card p-6">
                <stat.icon className={`mb-3 h-5 w-5 ${stat.color}`} />
                <p className="font-serif text-3xl font-bold text-card-foreground">{stat.value}</p>
                <p className={`text-sm ${stat.color}`}>{stat.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Token Reference */}
        <section>
          <h3 className="mb-6 font-serif text-2xl font-semibold">CSS Token Reference</h3>
          <div className="rounded-lg border border-border bg-card p-6 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="pb-3 text-left font-medium text-foreground">Token</th>
                  <th className="pb-3 text-left font-medium text-foreground">Light Theme</th>
                  <th className="pb-3 text-left font-medium text-foreground">Dark Theme</th>
                  <th className="pb-3 text-left font-medium text-foreground">Usage</th>
                </tr>
              </thead>
              <tbody className="font-mono text-xs">
                <TokenRow
                  token="--background"
                  light="Warm cream #F6F0E3"
                  dark="Warm charcoal (Iron Ore)"
                  usage="Page background"
                />
                <TokenRow
                  token="--foreground"
                  light="Charcoal-olive #3B3F36"
                  dark="Parchment cream"
                  usage="Primary text"
                />
                <TokenRow
                  token="--primary"
                  light="Olive green #6E7C65"
                  dark="Forest green (Hunt Club)"
                  usage="Primary actions, links"
                />
                <TokenRow
                  token="--secondary"
                  light="Sand beige #D9D2C2"
                  dark="Warm brown (Urbane Bronze)"
                  usage="Secondary surfaces"
                />
                <TokenRow
                  token="--accent"
                  light="Soft sage #AAB7A2"
                  dark="Burgundy (Dark Auburn)"
                  usage="Accent highlights"
                />
                <TokenRow
                  token="--muted"
                  light="Sand beige"
                  dark="Warm brown-gray"
                  usage="Muted backgrounds"
                />
                <TokenRow
                  token="--destructive"
                  light="Warm burgundy"
                  dark="Deep burgundy"
                  usage="Error states"
                />
                <TokenRow
                  token="--border"
                  light="Sand beige"
                  dark="Warm brown"
                  usage="Borders, dividers"
                />
                <TokenRow
                  token="--chart-1"
                  light="Olive green"
                  dark="Forest green"
                  usage="Primary chart data"
                />
                <TokenRow
                  token="--chart-2"
                  light="Soft sage"
                  dark="Burgundy"
                  usage="Secondary chart data"
                />
                <TokenRow
                  token="--chart-3"
                  light="Sand beige"
                  dark="Golden oak"
                  usage="Tertiary chart data"
                />
                <TokenRow
                  token="--chart-4"
                  light="Dark charcoal"
                  dark="Urbane bronze"
                  usage="Quaternary chart data"
                />
                <TokenRow
                  token="--chart-5"
                  light="Mid olive-sage"
                  dark="Sage green"
                  usage="Quinary chart data"
                />
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card">
        <div className="mx-auto max-w-6xl px-6 py-8 text-center text-sm text-muted-foreground">
          Dark Academia Design System - Inspired by classical aesthetics and scholarly tradition
        </div>
      </footer>
    </div>
  )
}

function ColorSwatch({
  name,
  variable,
  description,
  small = false,
}: {
  name: string
  variable: string
  description: string
  small?: boolean
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className={`${variable} ${small ? 'h-16' : 'h-24'}`} />
      <div className="p-3">
        <p className={`font-medium text-card-foreground ${small ? 'text-xs' : 'text-sm'}`}>
          {name}
        </p>
        <p className={`text-muted-foreground ${small ? 'text-[10px]' : 'text-xs'}`}>
          {description}
        </p>
      </div>
    </div>
  )
}

function TokenRow({
  token,
  light,
  dark,
  usage,
}: {
  token: string
  light: string
  dark: string
  usage: string
}) {
  return (
    <tr className="border-b border-border last:border-0">
      <td className="py-3 text-primary">{token}</td>
      <td className="py-3 text-muted-foreground">{light}</td>
      <td className="py-3 text-muted-foreground">{dark}</td>
      <td className="py-3 text-muted-foreground">{usage}</td>
    </tr>
  )
}
