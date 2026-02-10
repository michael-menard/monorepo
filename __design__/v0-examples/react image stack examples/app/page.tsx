import { PerspectiveStack } from "@/components/perspective-stack"
import { OrganicPile } from "@/components/organic-pile"
import { CardFan } from "@/components/card-fan"
import { TinderStack } from "@/components/tinder-stack"
import { ThemeToggle } from "@/components/theme-toggle"

export default function Page() {
  return (
    <main className="min-h-screen bg-secondary py-16 px-4 sm:px-8">
      <div className="max-w-5xl mx-auto">
        <header className="text-center mb-16">
          <div className="mb-4">
            <ThemeToggle />
          </div>
          <p className="text-xs font-mono uppercase tracking-[0.2em] text-muted-foreground mb-3">
            Component Library
          </p>
          <h1 className="text-3xl sm:text-4xl font-sans font-bold tracking-tight text-foreground text-balance">
            Photo Collection Patterns
          </h1>
          <p className="mt-3 text-muted-foreground max-w-lg mx-auto text-pretty">
            Four stacking patterns with mixed aspect ratios in each stack.
            Interact with the Tinder stack by dragging cards.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <section className="flex flex-col items-center">
            <div className="bg-background rounded-lg border border-border w-full overflow-hidden">
              <div className="px-5 pt-5 pb-3 border-b border-border">
                <h2 className="text-sm font-semibold text-foreground">
                  Perspective Offset Stack
                </h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Layered cards with incremental offset to show depth
                </p>
              </div>
              <div className="p-6">
                <PerspectiveStack expandable />
              </div>
            </div>
          </section>

          <section className="flex flex-col items-center">
            <div className="bg-background rounded-lg border border-border w-full overflow-hidden">
              <div className="px-5 pt-5 pb-3 border-b border-border">
                <h2 className="text-sm font-semibold text-foreground">
                  Organic Shuffled Pile
                </h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Randomly rotated cards resembling a messy desk
                </p>
              </div>
              <div className="p-6">
                <OrganicPile expandable />
              </div>
            </div>
          </section>

          <section className="flex flex-col items-center">
            <div className="bg-background rounded-lg border border-border w-full overflow-hidden">
              <div className="px-5 pt-5 pb-3 border-b border-border">
                <h2 className="text-sm font-semibold text-foreground">
                  Card Fan
                </h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Cards fanned out from a shared pivot like a hand of cards
                </p>
              </div>
              <div className="p-6">
                <CardFan expandable />
              </div>
            </div>
          </section>

          <section className="flex flex-col items-center">
            <div className="bg-background rounded-lg border border-border w-full overflow-hidden">
              <div className="px-5 pt-5 pb-3 border-b border-border">
                <h2 className="text-sm font-semibold text-foreground">
                  Tinder Swipe Stack
                </h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Drag cards left or right to dismiss and reveal the next
                </p>
              </div>
              <div className="p-6">
                <TinderStack expandable />
              </div>
            </div>
          </section>
        </div>

        <footer className="text-center mt-16">
          <p className="text-xs text-muted-foreground font-mono">
            Built with Next.js, Tailwind CSS & Framer Motion
          </p>
        </footer>
      </div>
    </main>
  )
}
