'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Sun, Moon } from 'lucide-react'

const navItems = [
  { href: '/', label: 'Overview' },
  { href: '/typography', label: 'Typography' },
  { href: '/colors', label: 'Colors' },
  { href: '/layout-spacing', label: 'Layout' },
  { href: '/components', label: 'Components' },
  { href: '/patterns', label: 'Patterns' },
  { href: '/style-guide', label: 'Style Guide' },
]

export function DesignSystemNav() {
  const pathname = usePathname()
  const [isDark, setIsDark] = useState(false)

  const toggleTheme = () => {
    setIsDark(!isDark)
    document.documentElement.classList.toggle('dark')
  }

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-sm">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <div>
            <h1 className="text-xl font-bold text-foreground">Dark Academia</h1>
            <p className="text-sm text-muted-foreground">Design System</p>
          </div>
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map(item => (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                  pathname === item.href
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <Button variant="outline" size="icon" onClick={toggleTheme} className="rounded-full">
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
      </div>
    </header>
  )
}
