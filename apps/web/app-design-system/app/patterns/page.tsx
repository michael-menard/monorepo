'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DesignSystemNav } from '@/components/design-system-nav'
import {
  Eye,
  LayoutGrid,
  Package,
  Users,
  Palette,
  Wrench,
  RefreshCw,
  Clock,
  ArrowUpRight,
  TrendingUp,
  TrendingDown,
  Settings,
  Mail,
} from 'lucide-react'

export default function PatternsPage() {
  return (
    <div className="min-h-screen bg-background transition-colors duration-300">
      <DesignSystemNav />

      <main className="max-w-6xl mx-auto px-6 py-12 space-y-16">
        {/* Image Card Overlays */}
        <section className="space-y-8">
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Image Card Overlays</h2>
            <p className="text-muted-foreground">
              Slide-up drawer patterns for image cards on hover.
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Slide-Up Drawer</CardTitle>
              <CardDescription>
                Hover over the cards to see the slide-up overlay effect.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <div className="space-y-4">
                <p className="text-sm font-medium text-foreground">Basic Slide-Up</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    {
                      name: 'Castle Keep',
                      img: 'https://images.unsplash.com/photo-1486325212027-8081e485255e?w=300&h=300&fit=crop',
                    },
                    {
                      name: 'Train Station',
                      img: 'https://images.unsplash.com/photo-1527684651001-731c474bbb5a?w=300&h=300&fit=crop',
                    },
                    {
                      name: 'Mountain Lodge',
                      img: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=300&h=300&fit=crop',
                    },
                    {
                      name: 'Town Square',
                      img: 'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=300&h=300&fit=crop',
                    },
                  ].map(item => (
                    <div
                      key={item.name}
                      className="relative aspect-square rounded-lg overflow-hidden group cursor-pointer"
                    >
                      <img
                        src={item.img}
                        alt={item.name}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-foreground/90 to-transparent translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out">
                        <div className="absolute bottom-0 inset-x-0 p-3">
                          <p className="text-sm font-medium text-background truncate">
                            {item.name}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs font-mono text-muted-foreground">
                  translate-y-full group-hover:translate-y-0 transition-transform duration-300
                </p>
              </div>

              <div className="space-y-4">
                <p className="text-sm font-medium text-foreground">Slide-Up with Subtitle</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    {
                      name: 'Medieval Castle',
                      subtitle: '1,284 pieces',
                      img: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=300&h=300&fit=crop',
                    },
                    {
                      name: 'Steam Engine',
                      subtitle: '543 pieces',
                      img: 'https://images.unsplash.com/photo-1474487548417-781cb71495f3?w=300&h=300&fit=crop',
                    },
                    {
                      name: 'Lighthouse',
                      subtitle: '892 pieces',
                      img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=300&fit=crop',
                    },
                    {
                      name: 'Windmill',
                      subtitle: '678 pieces',
                      img: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=300&h=300&fit=crop',
                    },
                  ].map(item => (
                    <div
                      key={item.name}
                      className="relative aspect-square rounded-lg overflow-hidden group cursor-pointer"
                    >
                      <img
                        src={item.img}
                        alt={item.name}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-foreground/95 via-foreground/60 to-transparent translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out">
                        <div className="absolute bottom-0 inset-x-0 p-3">
                          <p className="text-sm font-medium text-background truncate">
                            {item.name}
                          </p>
                          <p className="text-xs text-background/70">{item.subtitle}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-sm font-medium text-foreground">Full Overlay with Actions</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    {
                      name: 'City Hall',
                      img: 'https://images.unsplash.com/photo-1555636222-cae831e670b3?w=300&h=300&fit=crop',
                    },
                    {
                      name: 'Harbor Scene',
                      img: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=300&h=300&fit=crop',
                    },
                    {
                      name: 'Forest Cabin',
                      img: 'https://images.unsplash.com/photo-1542718610-a1d656d1884c?w=300&h=300&fit=crop',
                    },
                    {
                      name: 'Clock Tower',
                      img: 'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=300&h=300&fit=crop',
                    },
                  ].map(item => (
                    <div
                      key={item.name}
                      className="relative aspect-square rounded-lg overflow-hidden group cursor-pointer"
                    >
                      <img
                        src={item.img}
                        alt={item.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/60 transition-colors duration-300">
                        <div className="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <p className="text-sm font-medium text-background mb-3">{item.name}</p>
                          <div className="flex gap-2">
                            <Button size="sm" variant="secondary" className="h-8">
                              <Eye className="h-3 w-3 mr-1" />
                              View
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-sm font-medium text-foreground">
                  Bottom Bar (Always Visible Title)
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    {
                      name: 'Village House',
                      status: 'Published',
                      img: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=300&h=300&fit=crop',
                    },
                    {
                      name: 'Bakery Shop',
                      status: 'Draft',
                      img: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=300&h=300&fit=crop',
                    },
                    {
                      name: 'Fire Station',
                      status: 'Published',
                      img: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=300&h=300&fit=crop',
                    },
                    {
                      name: 'Library',
                      status: 'Review',
                      img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=300&fit=crop',
                    },
                  ].map(item => (
                    <div
                      key={item.name}
                      className="relative aspect-square rounded-lg overflow-hidden group cursor-pointer"
                    >
                      <img
                        src={item.img}
                        alt={item.name}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-foreground/90 to-transparent p-3 pt-8">
                        <p className="text-sm font-medium text-background truncate">{item.name}</p>
                      </div>
                      <div className="absolute inset-x-0 bottom-0 h-24 bg-foreground/95 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out">
                        <div className="p-3 space-y-2">
                          <p className="text-sm font-medium text-background">{item.name}</p>
                          <Badge
                            variant="secondary"
                            className={
                              item.status === 'Published'
                                ? 'bg-primary/20 text-primary border-primary/30'
                                : item.status === 'Draft'
                                  ? 'bg-muted text-muted-foreground'
                                  : 'bg-chart-3/20 text-chart-3 border-chart-3/30'
                            }
                          >
                            {item.status}
                          </Badge>
                          <div className="flex gap-2 pt-1">
                            <Button size="sm" variant="secondary" className="h-7 text-xs flex-1">
                              Edit
                            </Button>
                            <Button size="sm" variant="secondary" className="h-7 text-xs flex-1">
                              View
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-sm font-medium text-foreground">
                  Themed Overlay (Dark Academia)
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    {
                      name: 'Ancient Library',
                      img: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=300&h=300&fit=crop',
                    },
                    {
                      name: 'Gothic Chapel',
                      img: 'https://images.unsplash.com/photo-1548407260-da850faa41e3?w=300&h=300&fit=crop',
                    },
                    {
                      name: 'Stone Bridge',
                      img: 'https://images.unsplash.com/photo-1533105079780-92b9be482077?w=300&h=300&fit=crop',
                    },
                    {
                      name: 'Manor House',
                      img: 'https://images.unsplash.com/photo-1464146072230-91cabc968266?w=300&h=300&fit=crop',
                    },
                  ].map(item => (
                    <div
                      key={item.name}
                      className="relative aspect-square rounded-lg overflow-hidden group cursor-pointer border border-border"
                    >
                      <img
                        src={item.img}
                        alt={item.name}
                        className="w-full h-full object-cover transition-all duration-500 group-hover:scale-105 group-hover:brightness-75"
                      />
                      <div
                        className="absolute inset-x-0 bottom-0 h-20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"
                        style={{
                          background:
                            'linear-gradient(to top, var(--primary) 0%, var(--primary) 40%, transparent 100%)',
                        }}
                      >
                        <div className="absolute bottom-0 inset-x-0 p-3">
                          <p className="text-sm font-medium text-primary-foreground truncate">
                            {item.name}
                          </p>
                          <p className="text-xs text-primary-foreground/70">Click to explore</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Gauge Charts */}
        <section className="space-y-8">
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Gauge Charts</h2>
            <p className="text-muted-foreground">
              Semi-circular progress indicators for percentages and scores.
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Percentage Gauges</CardTitle>
              <CardDescription>
                Half-donut style gauges for displaying progress and completion rates.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <div className="space-y-4">
                <p className="text-sm font-medium text-foreground">Basic Gauges</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  {[
                    { value: 59, label: 'Completion', color: 'var(--chart-5)' },
                    { value: 85, label: 'Progress', color: 'var(--primary)' },
                    { value: 42, label: 'Coverage', color: 'var(--chart-3)' },
                    { value: 73, label: 'Score', color: 'var(--destructive)' },
                  ].map(gauge => (
                    <div key={gauge.label} className="flex flex-col items-center">
                      <div className="relative w-32 h-16 overflow-hidden">
                        <svg viewBox="0 0 100 50" className="w-full h-full">
                          <path
                            d="M 10 50 A 40 40 0 0 1 90 50"
                            fill="none"
                            stroke="var(--muted)"
                            strokeWidth="8"
                            strokeLinecap="round"
                          />
                          <path
                            d="M 10 50 A 40 40 0 0 1 90 50"
                            fill="none"
                            stroke={gauge.color}
                            strokeWidth="8"
                            strokeLinecap="round"
                            strokeDasharray={`${gauge.value * 1.26} 126`}
                          />
                        </svg>
                      </div>
                      <p className="text-2xl font-bold text-foreground -mt-2">{gauge.value}%</p>
                      <p className="text-xs text-muted-foreground">{gauge.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-sm font-medium text-foreground">Large Gauge with Label</p>
                <div className="flex justify-center">
                  <Card className="w-72">
                    <CardHeader className="pb-2 text-center">
                      <CardTitle className="text-base">Build Completion</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center pb-6">
                      <div className="relative w-48 h-24 overflow-hidden">
                        <svg viewBox="0 0 100 50" className="w-full h-full">
                          <path
                            d="M 10 50 A 40 40 0 0 1 90 50"
                            fill="none"
                            stroke="var(--muted)"
                            strokeWidth="10"
                            strokeLinecap="round"
                          />
                          <path
                            d="M 10 50 A 40 40 0 0 1 90 50"
                            fill="none"
                            stroke="var(--primary)"
                            strokeWidth="10"
                            strokeLinecap="round"
                            strokeDasharray="94.5 126"
                          />
                        </svg>
                      </div>
                      <p className="text-4xl font-bold text-foreground -mt-4">75%</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        183 of 244 steps complete
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-sm font-medium text-foreground">Gauge Sizes</p>
                <div className="flex flex-wrap items-end justify-center gap-8">
                  {[
                    {
                      width: 'w-20',
                      height: 'h-10',
                      textSize: 'text-lg',
                      mt: '-mt-1',
                      label: 'Small',
                      sw: '10',
                    },
                    {
                      width: 'w-32',
                      height: 'h-16',
                      textSize: 'text-2xl',
                      mt: '-mt-2',
                      label: 'Medium',
                      sw: '8',
                    },
                    {
                      width: 'w-48',
                      height: 'h-24',
                      textSize: 'text-3xl',
                      mt: '-mt-3',
                      label: 'Large',
                      sw: '6',
                    },
                  ].map(size => (
                    <div key={size.label} className="flex flex-col items-center">
                      <div className={`relative ${size.width} ${size.height} overflow-hidden`}>
                        <svg viewBox="0 0 100 50" className="w-full h-full">
                          <path
                            d="M 10 50 A 40 40 0 0 1 90 50"
                            fill="none"
                            stroke="var(--muted)"
                            strokeWidth={size.sw}
                            strokeLinecap="round"
                          />
                          <path
                            d="M 10 50 A 40 40 0 0 1 90 50"
                            fill="none"
                            stroke="var(--primary)"
                            strokeWidth={size.sw}
                            strokeLinecap="round"
                            strokeDasharray="63 126"
                          />
                        </svg>
                      </div>
                      <p className={`${size.textSize} font-bold text-foreground ${size.mt}`}>50%</p>
                      <p className="text-xs text-muted-foreground">{size.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-sm font-medium text-foreground">Themed Gauges</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { value: 92, label: 'Excellent', status: 'Success', color: 'var(--primary)' },
                    { value: 58, label: 'Average', status: 'Warning', color: 'var(--chart-3)' },
                    {
                      value: 23,
                      label: 'Needs Work',
                      status: 'Critical',
                      color: 'var(--destructive)',
                    },
                  ].map(gauge => (
                    <Card key={gauge.label}>
                      <CardContent className="pt-4 flex flex-col items-center">
                        <div className="relative w-36 h-[72px] overflow-hidden">
                          <svg viewBox="0 0 100 50" className="w-full h-full">
                            <path
                              d="M 10 50 A 40 40 0 0 1 90 50"
                              fill="none"
                              stroke="var(--muted)"
                              strokeWidth="8"
                              strokeLinecap="round"
                            />
                            <path
                              d="M 10 50 A 40 40 0 0 1 90 50"
                              fill="none"
                              stroke={gauge.color}
                              strokeWidth="8"
                              strokeLinecap="round"
                              strokeDasharray={`${gauge.value * 1.26} 126`}
                            />
                          </svg>
                        </div>
                        <p className="text-3xl font-bold text-foreground -mt-2">{gauge.value}%</p>
                        <Badge
                          className={
                            gauge.status === 'Success'
                              ? 'bg-primary/20 text-primary border-primary/30 mt-2'
                              : gauge.status === 'Warning'
                                ? 'bg-chart-3/20 text-chart-3 border-chart-3/30 mt-2'
                                : 'bg-destructive/20 text-destructive border-destructive/30 mt-2'
                          }
                        >
                          {gauge.label}
                        </Badge>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Dashboard Patterns */}
        <section className="space-y-8">
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Dashboard Patterns</h2>
            <p className="text-muted-foreground">
              Stat cards, activity lists, and dashboard layouts.
            </p>
          </div>

          {/* Stat Cards */}
          <Card>
            <CardHeader>
              <CardTitle>Stat Cards</CardTitle>
              <CardDescription>Display key metrics at a glance.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <div className="space-y-4">
                <p className="text-sm font-medium text-foreground">Basic Stats Row</p>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {[
                    { value: '211', label: 'TOTAL MOCS', icon: LayoutGrid },
                    { value: '61', label: 'OWNED SETS', icon: Package },
                    { value: '0', label: 'MINIFIGS', icon: Users },
                    { value: '9', label: 'THEMES', icon: Palette },
                    { value: '0', label: 'PLANNED BUILDS', icon: Wrench },
                  ].map(stat => (
                    <Card key={stat.label} className="bg-card">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-3xl font-bold text-foreground">{stat.value}</p>
                            <p className="text-xs text-primary font-medium tracking-wide">
                              {stat.label}
                            </p>
                          </div>
                          <stat.icon className="h-5 w-5 text-muted-foreground" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-sm font-medium text-foreground">Stats with Trend Indicators</p>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {[
                    { value: '1,284', label: 'Total Views', change: '+12%', trend: 'up' },
                    { value: '423', label: 'Downloads', change: '+8%', trend: 'up' },
                    { value: '89', label: 'Comments', change: '-3%', trend: 'down' },
                    { value: '56', label: 'Followers', change: '+24%', trend: 'up' },
                  ].map(stat => (
                    <Card key={stat.label}>
                      <CardContent className="p-4">
                        <p className="text-sm text-muted-foreground">{stat.label}</p>
                        <div className="flex items-end justify-between mt-1">
                          <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                          <div
                            className={`flex items-center text-xs font-medium ${stat.trend === 'up' ? 'text-primary' : 'text-destructive'}`}
                          >
                            {stat.trend === 'up' ? (
                              <TrendingUp className="h-3 w-3 mr-1" />
                            ) : (
                              <TrendingDown className="h-3 w-3 mr-1" />
                            )}
                            {stat.change}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-sm font-medium text-foreground">Compact Inline Stats</p>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex flex-wrap gap-6">
                      {[
                        { value: '435', label: 'Total Items' },
                        { value: '216', label: 'City & Modular' },
                        { value: '41', label: 'Castle & Medieval' },
                        { value: '45', label: 'Nature' },
                      ].map((stat, i) => (
                        <div key={stat.label} className="flex items-center gap-4">
                          <div>
                            <p className="text-xl font-bold text-foreground">{stat.value}</p>
                            <p className="text-xs text-muted-foreground">{stat.label}</p>
                          </div>
                          {i < 3 && <Separator orientation="vertical" className="h-10" />}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>

          {/* Activity Lists */}
          <Card>
            <CardHeader>
              <CardTitle>Activity Lists</CardTitle>
              <CardDescription>Recent activity feeds and timelines.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <div className="space-y-4">
                <p className="text-sm font-medium text-foreground">Recent Activity (with Images)</p>
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <RefreshCw className="h-4 w-4 text-muted-foreground" />
                        Recent Activity
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {[
                      {
                        action: 'Updated MOC',
                        item: 'The old goods shed corner modular',
                        time: 'in about 4 hours',
                        img: 'https://images.unsplash.com/photo-1486325212027-8081e485255e?w=80&h=80&fit=crop',
                      },
                      {
                        action: 'Updated MOC',
                        item: 'The Hobbit Diorama',
                        time: 'in about 4 hours',
                        img: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=80&h=80&fit=crop',
                      },
                      {
                        action: 'Updated MOC',
                        item: 'Horse Knight Citadel',
                        time: 'in about 4 hours',
                        img: null,
                      },
                      {
                        action: 'Updated MOC',
                        item: 'Magic Kingdom Main Street Cinema',
                        time: 'in about 3 hours',
                        img: 'https://images.unsplash.com/photo-1555636222-cae831e670b3?w=80&h=80&fit=crop',
                      },
                      {
                        action: 'Updated MOC',
                        item: 'LotR Mines of Moria Staircase',
                        time: 'in about 3 hours',
                        img: null,
                      },
                    ].map((activity, i) => (
                      <div key={i} className="flex items-start gap-3">
                        {activity.img ? (
                          <img
                            src={activity.img}
                            alt={activity.item}
                            className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <RefreshCw className="h-4 w-4 text-primary" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-foreground">
                            <span className="font-medium">{activity.action}:</span>{' '}
                            <span className="text-foreground">{activity.item}</span>
                          </p>
                          <p className="text-xs text-muted-foreground">{activity.time}</p>
                        </div>
                      </div>
                    ))}
                    <Button variant="link" className="px-0 text-primary">
                      View all activity
                    </Button>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-4">
                <p className="text-sm font-medium text-foreground">Activity with Avatars</p>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Team Activity</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {[
                      {
                        user: 'John D.',
                        avatar: 'JD',
                        action: 'created a new MOC',
                        item: 'Victorian Library',
                        time: '2 hours ago',
                      },
                      {
                        user: 'Sarah M.',
                        avatar: 'SM',
                        action: 'commented on',
                        item: 'Castle Keep',
                        time: '3 hours ago',
                      },
                      {
                        user: 'Mike R.',
                        avatar: 'MR',
                        action: 'published',
                        item: 'Train Station Modular',
                        time: '5 hours ago',
                      },
                    ].map((activity, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs bg-primary/20 text-primary">
                            {activity.avatar}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm">
                            <span className="font-medium text-foreground">{activity.user}</span>{' '}
                            <span className="text-muted-foreground">{activity.action}</span>{' '}
                            <span className="font-medium text-foreground">{activity.item}</span>
                          </p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {activity.time}
                          </p>
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <ArrowUpRight className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-4">
                <p className="text-sm font-medium text-foreground">Timeline Style</p>
                <Card>
                  <CardContent className="pt-6">
                    <div className="relative">
                      <div className="absolute left-[11px] top-2 bottom-2 w-px bg-border" />
                      <div className="space-y-6">
                        {[
                          {
                            date: 'Today',
                            items: [
                              { action: 'Published', item: 'Gothic Cathedral', time: '10:30 AM' },
                              { action: 'Updated', item: 'Medieval Market', time: '9:15 AM' },
                            ],
                          },
                          {
                            date: 'Yesterday',
                            items: [
                              { action: 'Created', item: 'Harbor Warehouse', time: '4:20 PM' },
                              { action: 'Commented', item: 'Town Hall', time: '2:00 PM' },
                            ],
                          },
                        ].map(group => (
                          <div key={group.date} className="space-y-3">
                            <div className="flex items-center gap-3">
                              <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center z-10">
                                <div className="w-2 h-2 rounded-full bg-primary-foreground" />
                              </div>
                              <p className="text-sm font-semibold text-foreground">{group.date}</p>
                            </div>
                            <div className="ml-9 space-y-2">
                              {group.items.map((item, i) => (
                                <div
                                  key={i}
                                  className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50"
                                >
                                  <p className="text-sm">
                                    <span className="text-muted-foreground">{item.action}</span>{' '}
                                    <span className="font-medium text-foreground">{item.item}</span>
                                  </p>
                                  <p className="text-xs text-muted-foreground">{item.time}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>

          {/* Dashboard Layout Example */}
          <Card>
            <CardHeader>
              <CardTitle>Dashboard Layout</CardTitle>
              <CardDescription>
                Combining stats, charts, and activity in a typical dashboard grid.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { value: '211', label: 'Total MOCs', icon: LayoutGrid },
                    { value: '61', label: 'Owned Sets', icon: Package },
                    { value: '9', label: 'Themes', icon: Palette },
                    { value: '1.2k', label: 'Views', icon: Eye },
                  ].map(stat => (
                    <Card key={stat.label} className="bg-secondary/50">
                      <CardContent className="p-3">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-md bg-primary/10">
                            <stat.icon className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="text-xl font-bold text-foreground">{stat.value}</p>
                            <p className="text-xs text-muted-foreground">{stat.label}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-[1fr_300px] gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">Collection by Theme</CardTitle>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Settings className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="h-48 flex items-center justify-center border-2 border-dashed border-border rounded-lg">
                        <p className="text-sm text-muted-foreground">Chart Component</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <RefreshCw className="h-4 w-4" />
                        Recent Activity
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {[
                        { item: 'Castle Keep', time: '2h ago' },
                        { item: 'Train Station', time: '3h ago' },
                        { item: 'Lighthouse', time: '5h ago' },
                      ].map((activity, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <RefreshCw className="h-3 w-3 text-primary" />
                          <span className="flex-1 truncate text-foreground">{activity.item}</span>
                          <span className="text-xs text-muted-foreground">{activity.time}</span>
                        </div>
                      ))}
                      <Button variant="link" size="sm" className="px-0 text-primary">
                        View all
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Sample Component */}
        <section className="space-y-8">
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Sample Component</h2>
            <p className="text-muted-foreground">A dashboard widget showing the theme in action.</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Collection by Theme</CardTitle>
              <CardDescription>Distribution of items across categories.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-8">
                <div className="relative w-40 h-40">
                  <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                    {[
                      { percent: 50, color: 'chart-1' },
                      { percent: 15, color: 'chart-2' },
                      { percent: 15, color: 'chart-3' },
                      { percent: 10, color: 'chart-4' },
                      { percent: 10, color: 'chart-5' },
                    ].map((segment, i, arr) => {
                      const offset = arr.slice(0, i).reduce((a, s) => a + s.percent, 0)
                      return (
                        <circle
                          key={i}
                          cx="50"
                          cy="50"
                          r="35"
                          fill="none"
                          strokeWidth="15"
                          style={{ stroke: `var(--${segment.color})` }}
                          strokeDasharray={`${segment.percent} ${100 - segment.percent}`}
                          strokeDashoffset={-offset}
                        />
                      )
                    })}
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center flex-col">
                    <span className="text-xl font-bold text-foreground">435</span>
                    <span className="text-xs text-muted-foreground">Total</span>
                  </div>
                </div>

                <div className="space-y-2 text-sm flex-1">
                  {[
                    { name: 'City & Modular', count: 218, color: 'chart-1' },
                    { name: 'Castle & Medieval', count: 65, color: 'chart-2' },
                    { name: 'Vehicles', count: 65, color: 'chart-3' },
                    { name: 'Nature', count: 44, color: 'chart-4' },
                    { name: 'Trains', count: 43, color: 'chart-5' },
                  ].map(item => (
                    <div key={item.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-sm"
                          style={{ backgroundColor: `var(--${item.color})` }}
                        />
                        <span className="text-muted-foreground">{item.name}</span>
                      </div>
                      <span className="text-foreground font-medium">{item.count}</span>
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
