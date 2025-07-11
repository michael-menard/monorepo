import React from "react"

export function Navbar() {
  return (
    <nav className="flex space-x-6">
      <a href="/" className="text-foreground hover:text-foreground/80">Home</a>
      <a href="/about" className="text-foreground hover:text-foreground/80">About</a>
      <a href="/contact" className="text-foreground hover:text-foreground/80">Contact</a>
    </nav>
  )
} 