"use client"

import { Plus, Images, Heart } from "lucide-react"
import { Button } from "@/components/ui/button"

export function QuickActions() {
  return (
    <div className="flex flex-wrap gap-2 md:gap-3">
      <Button className="gap-1.5 md:gap-2 text-xs md:text-sm h-8 md:h-10 px-3 md:px-4 bg-primary text-primary-foreground hover:bg-primary/90">
        <Plus className="h-3.5 w-3.5 md:h-4 md:w-4" aria-hidden="true" />
        Add MOC
      </Button>
      <Button variant="outline" className="gap-1.5 md:gap-2 text-xs md:text-sm h-8 md:h-10 px-3 md:px-4 border-border bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground">
        <Images className="h-3.5 w-3.5 md:h-4 md:w-4" aria-hidden="true" />
        <span className="hidden sm:inline">Browse </span>Gallery
      </Button>
      <Button variant="outline" className="gap-1.5 md:gap-2 text-xs md:text-sm h-8 md:h-10 px-3 md:px-4 border-border bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground">
        <Heart className="h-3.5 w-3.5 md:h-4 md:w-4" aria-hidden="true" />
        <span className="hidden sm:inline">View </span>Wishlist
      </Button>
    </div>
  )
}
