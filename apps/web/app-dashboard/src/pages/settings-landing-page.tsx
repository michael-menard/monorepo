/**
 * SettingsLandingPage
 *
 * Landing page for /settings — shows navigation cards to each
 * settings sub-section (themes, scraper queue).
 */
import { Link } from 'react-router-dom'
import { Settings, Palette, Radar } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@repo/app-component-library'

const SECTIONS = [
  {
    to: '/settings/themes',
    icon: Palette,
    title: 'Tag-Theme Mappings',
    description: 'Drag tags into theme buckets to group your collection. The dashboard chart updates automatically.',
  },
  {
    to: '/settings/scraper',
    icon: Radar,
    title: 'Scrape Queue',
    description: 'Manage scraper jobs — add URLs, monitor progress, pause/resume queues.',
  },
]

export function SettingsLandingPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Settings className="h-5 w-5 text-primary" />
          Settings
        </h2>
        <p className="text-sm text-muted-foreground">
          Configure your collection, scrapers, and preferences.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {SECTIONS.map(section => {
          const Icon = section.icon
          return (
            <Link key={section.to} to={section.to} className="block group">
              <Card className="h-full transition-all duration-200 hover:border-primary/50 dark:hover:shadow-[0_0_15px_rgba(14,165,233,0.15)]">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base font-semibold">
                    <Icon className="h-4 w-4 text-primary" />
                    {section.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{section.description}</p>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
