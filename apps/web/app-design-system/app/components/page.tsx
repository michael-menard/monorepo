'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { DesignSystemNav } from '@/components/design-system-nav'
import {
  Check,
  AlertCircle,
  Info,
  User,
  Settings,
  Bell,
  Mail,
  MoreHorizontal,
  Search,
} from 'lucide-react'

export default function ComponentsPage() {
  return (
    <div className="min-h-screen bg-background transition-colors duration-300">
      <DesignSystemNav />

      <main className="max-w-6xl mx-auto px-6 py-12 space-y-16">
        {/* Buttons */}
        <section className="space-y-8">
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Buttons</h2>
            <p className="text-muted-foreground">
              Interactive button variants for different contexts.
            </p>
          </div>

          <Card>
            <CardContent className="pt-6">
              <div className="space-y-6">
                <div className="flex flex-wrap items-center gap-4">
                  <Button>Primary</Button>
                  <Button variant="secondary">Secondary</Button>
                  <Button variant="outline">Outline</Button>
                  <Button variant="ghost">Ghost</Button>
                  <Button variant="destructive">Destructive</Button>
                  <Button variant="link">Link</Button>
                </div>
                <div className="flex flex-wrap items-center gap-4">
                  <Button size="lg">Large</Button>
                  <Button size="default">Default</Button>
                  <Button size="sm">Small</Button>
                  <Button size="icon">
                    <Check className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap items-center gap-4">
                  <Button disabled>Disabled</Button>
                  <Button variant="outline" disabled>
                    Disabled Outline
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Form Elements */}
        <section className="space-y-8">
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Form Elements</h2>
            <p className="text-muted-foreground">Input fields and form controls.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Text Inputs</CardTitle>
                <CardDescription>Standard input field variations.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Default Input</label>
                  <Input placeholder="Enter text..." />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Disabled Input</label>
                  <Input placeholder="Disabled" disabled />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">With Value</label>
                  <Input defaultValue="Dark Academia Theme" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>States</CardTitle>
                <CardDescription>Input validation states.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Success State</label>
                  <div className="relative">
                    <Input defaultValue="Valid input" className="pr-10 border-primary" />
                    <Check className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Error State</label>
                  <div className="relative">
                    <Input defaultValue="Invalid input" className="pr-10 border-destructive" />
                    <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-destructive" />
                  </div>
                  <p className="text-xs text-destructive">This field is required.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Cards */}
        <section className="space-y-8">
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Cards</h2>
            <p className="text-muted-foreground">Container components for grouping content.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Default Card</CardTitle>
                <CardDescription>A standard card with header and content.</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Cards use the warm ivory background to stand out from the parchment page while
                  maintaining visual harmony.
                </p>
              </CardContent>
            </Card>

            <Card className="border-primary">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                  Highlighted Card
                </CardTitle>
                <CardDescription>With primary border accent.</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Use border colors to draw attention to important cards.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-secondary">
              <CardHeader>
                <CardTitle>Muted Card</CardTitle>
                <CardDescription>Using secondary background.</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Secondary backgrounds work well for less prominent content.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Badges & Tags */}
        <section className="space-y-8">
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Badges & Tags</h2>
            <p className="text-muted-foreground">Status indicators and labels.</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Badge Variants</CardTitle>
              <CardDescription>Different badge styles for various contexts.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Standard Badges</p>
                <div className="flex flex-wrap gap-2">
                  <Badge>Default</Badge>
                  <Badge variant="secondary">Secondary</Badge>
                  <Badge variant="outline">Outline</Badge>
                  <Badge variant="destructive">Destructive</Badge>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Status Badges</p>
                <div className="flex flex-wrap gap-2">
                  <Badge className="bg-primary/20 text-primary border-primary/30 hover:bg-primary/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary mr-1.5" />
                    Active
                  </Badge>
                  <Badge className="bg-chart-3/20 text-chart-3 border-chart-3/30 hover:bg-chart-3/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-chart-3 mr-1.5" />
                    Pending
                  </Badge>
                  <Badge className="bg-destructive/20 text-destructive border-destructive/30 hover:bg-destructive/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-destructive mr-1.5" />
                    Error
                  </Badge>
                  <Badge className="bg-muted text-muted-foreground border-border hover:bg-muted/80">
                    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground mr-1.5" />
                    Inactive
                  </Badge>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Tags (Removable)</p>
                <div className="flex flex-wrap gap-2">
                  {['Castle', 'Medieval', 'MOC', 'Instructions'].map(tag => (
                    <Badge key={tag} variant="secondary" className="pl-2 pr-1 gap-1">
                      {tag}
                      <button className="ml-1 rounded-full hover:bg-foreground/10 p-0.5">
                        <svg
                          className="w-3 h-3"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Badge Sizes</p>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="text-[10px] px-1.5 py-0">XS Badge</Badge>
                  <Badge className="text-xs">Small Badge</Badge>
                  <Badge className="text-sm px-3 py-1">Medium Badge</Badge>
                  <Badge className="text-base px-4 py-1.5">Large Badge</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Avatars */}
        <section className="space-y-8">
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Avatars</h2>
            <p className="text-muted-foreground">User representation with images and fallbacks.</p>
          </div>

          <Card>
            <CardContent className="pt-6 space-y-6">
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Avatar Sizes</p>
                <div className="flex items-end gap-4">
                  {[
                    { size: 'h-6 w-6', label: '24px', fallbackClass: 'text-[8px]', fallback: 'XS' },
                    { size: 'h-8 w-8', label: '32px', fallbackClass: 'text-xs', fallback: 'SM' },
                    { size: 'h-10 w-10', label: '40px', fallbackClass: '', fallback: 'MD' },
                    { size: 'h-12 w-12', label: '48px', fallbackClass: '', fallback: 'LG' },
                    { size: 'h-16 w-16', label: '64px', fallbackClass: 'text-lg', fallback: 'XL' },
                  ].map(av => (
                    <div key={av.label} className="text-center">
                      <Avatar className={av.size}>
                        <AvatarImage src="https://github.com/shadcn.png" />
                        <AvatarFallback className={av.fallbackClass}>{av.fallback}</AvatarFallback>
                      </Avatar>
                      <p className="text-xs text-muted-foreground mt-1">{av.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Fallback Styles</p>
                <div className="flex items-center gap-4">
                  <Avatar>
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      JD
                    </AvatarFallback>
                  </Avatar>
                  <Avatar>
                    <AvatarFallback className="bg-destructive text-destructive-foreground">
                      AB
                    </AvatarFallback>
                  </Avatar>
                  <Avatar>
                    <AvatarFallback className="bg-chart-3 text-foreground">CD</AvatarFallback>
                  </Avatar>
                  <Avatar>
                    <AvatarFallback className="bg-accent text-accent-foreground">EF</AvatarFallback>
                  </Avatar>
                  <Avatar>
                    <AvatarFallback>
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Avatar Groups</p>
                <div className="flex -space-x-3">
                  {[1, 2, 3, 4, 5].map(i => (
                    <Avatar key={i} className="border-2 border-background">
                      <AvatarImage src={`https://i.pravatar.cc/40?img=${i + 10}`} />
                      <AvatarFallback>U{i}</AvatarFallback>
                    </Avatar>
                  ))}
                  <Avatar className="border-2 border-background">
                    <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                      +12
                    </AvatarFallback>
                  </Avatar>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Avatar with Status</p>
                <div className="flex items-center gap-4">
                  {[
                    { img: 1, fallback: 'ON', color: 'bg-primary' },
                    { img: 2, fallback: 'AW', color: 'bg-chart-3' },
                    { img: 3, fallback: 'OF', color: 'bg-muted-foreground' },
                  ].map(av => (
                    <div key={av.fallback} className="relative">
                      <Avatar>
                        <AvatarImage src={`https://i.pravatar.cc/40?img=${av.img}`} />
                        <AvatarFallback>{av.fallback}</AvatarFallback>
                      </Avatar>
                      <span
                        className={`absolute bottom-0 right-0 w-3 h-3 ${av.color} rounded-full border-2 border-background`}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Tooltips */}
        <TooltipProvider>
          <section className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-2">Tooltips</h2>
              <p className="text-muted-foreground">Contextual information on hover.</p>
            </div>

            <Card>
              <CardContent className="pt-6 space-y-6">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground">Tooltip Positions</p>
                  <div className="flex flex-wrap gap-4">
                    {(['top', 'bottom', 'left', 'right'] as const).map(side => (
                      <Tooltip key={side}>
                        <TooltipTrigger asChild>
                          <Button variant="outline">
                            Hover ({side.charAt(0).toUpperCase() + side.slice(1)})
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side={side}>
                          <p>Tooltip on {side}</p>
                        </TooltipContent>
                      </Tooltip>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground">Icon Tooltips</p>
                  <div className="flex gap-2">
                    {[
                      { icon: Settings, label: 'Settings' },
                      { icon: Bell, label: 'Notifications' },
                      { icon: Mail, label: 'Messages' },
                    ].map(item => (
                      <Tooltip key={item.label}>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <item.icon className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>{item.label}</TooltipContent>
                      </Tooltip>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>
        </TooltipProvider>

        {/* Modals & Dialogs */}
        <section className="space-y-8">
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Modals & Dialogs</h2>
            <p className="text-muted-foreground">Overlay windows for focused interactions.</p>
          </div>

          <Card>
            <CardContent className="pt-6 space-y-6">
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Dialog Examples</p>
                <div className="flex flex-wrap gap-4">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button>Basic Dialog</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Dialog Title</DialogTitle>
                        <DialogDescription>
                          This is a basic dialog with a title, description, and action buttons.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="py-4">
                        <p className="text-sm text-muted-foreground">
                          Dialog content goes here. You can include forms, information, or any other
                          content.
                        </p>
                      </div>
                      <DialogFooter>
                        <Button variant="outline">Cancel</Button>
                        <Button>Confirm</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="destructive">Delete Confirmation</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Are you sure?</DialogTitle>
                        <DialogDescription>
                          This action cannot be undone. This will permanently delete this item.
                        </DialogDescription>
                      </DialogHeader>
                      <DialogFooter>
                        <Button variant="outline">Cancel</Button>
                        <Button variant="destructive">Delete</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline">Form Dialog</Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>Edit Profile</DialogTitle>
                        <DialogDescription>Make changes to your profile here.</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-foreground">Name</label>
                          <Input placeholder="Enter your name" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-foreground">Email</label>
                          <Input type="email" placeholder="Enter your email" />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline">Cancel</Button>
                        <Button>Save Changes</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Tables */}
        <section className="space-y-8">
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Tables</h2>
            <p className="text-muted-foreground">Data display in tabular format.</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Data Table</CardTitle>
              <CardDescription>Example table with various data types.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[250px]">Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Theme</TableHead>
                    <TableHead className="text-right">Pieces</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[
                    {
                      name: 'Castle Keep',
                      status: 'Published',
                      theme: 'Castle & Medieval',
                      pieces: 1284,
                    },
                    {
                      name: 'Train Station',
                      status: 'Draft',
                      theme: 'City & Modular',
                      pieces: 2156,
                    },
                    { name: 'Mountain Refuge', status: 'Published', theme: 'Nature', pieces: 876 },
                    { name: 'Steam Engine', status: 'Review', theme: 'Trains', pieces: 543 },
                    {
                      name: 'Town Square',
                      status: 'Published',
                      theme: 'City & Modular',
                      pieces: 1892,
                    },
                  ].map(item => (
                    <TableRow key={item.name}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            item.status === 'Published'
                              ? 'default'
                              : item.status === 'Draft'
                                ? 'secondary'
                                : 'outline'
                          }
                          className={
                            item.status === 'Published'
                              ? 'bg-primary/20 text-primary border-primary/30'
                              : ''
                          }
                        >
                          {item.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{item.theme}</TableCell>
                      <TableCell className="text-right font-mono">
                        {item.pieces.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </section>

        {/* Tabs */}
        <section className="space-y-8">
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Tabs</h2>
            <p className="text-muted-foreground">Organize content into switchable panels.</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Tab Variants</CardTitle>
              <CardDescription>Different tab styles for various contexts.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <div className="space-y-4">
                <p className="text-sm font-medium text-foreground">Default Tabs</p>
                <Tabs defaultValue="overview" className="w-full">
                  <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="instructions">Instructions</TabsTrigger>
                    <TabsTrigger value="parts">Parts List</TabsTrigger>
                    <TabsTrigger value="comments">Comments</TabsTrigger>
                  </TabsList>
                  <TabsContent value="overview" className="mt-4">
                    <div className="rounded-lg border border-border p-4">
                      <p className="text-sm text-muted-foreground">
                        Overview content goes here. This is the default active tab.
                      </p>
                    </div>
                  </TabsContent>
                  <TabsContent value="instructions" className="mt-4">
                    <div className="rounded-lg border border-border p-4">
                      <p className="text-sm text-muted-foreground">
                        Building instructions content.
                      </p>
                    </div>
                  </TabsContent>
                  <TabsContent value="parts" className="mt-4">
                    <div className="rounded-lg border border-border p-4">
                      <p className="text-sm text-muted-foreground">Parts list content.</p>
                    </div>
                  </TabsContent>
                  <TabsContent value="comments" className="mt-4">
                    <div className="rounded-lg border border-border p-4">
                      <p className="text-sm text-muted-foreground">Comments content.</p>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>

              <div className="space-y-4">
                <p className="text-sm font-medium text-foreground">Full Width Tabs</p>
                <Tabs defaultValue="all" className="w-full">
                  <TabsList className="w-full grid grid-cols-4">
                    <TabsTrigger value="all">All</TabsTrigger>
                    <TabsTrigger value="published">Published</TabsTrigger>
                    <TabsTrigger value="drafts">Drafts</TabsTrigger>
                    <TabsTrigger value="archived">Archived</TabsTrigger>
                  </TabsList>
                  <TabsContent value="all" className="mt-4">
                    <div className="rounded-lg border border-border p-4">
                      <p className="text-sm text-muted-foreground">All items displayed here.</p>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>

              <div className="space-y-4">
                <p className="text-sm font-medium text-foreground">Tabs with Icons</p>
                <Tabs defaultValue="settings" className="w-full">
                  <TabsList>
                    <TabsTrigger value="settings" className="gap-2">
                      <Settings className="h-4 w-4" />
                      Settings
                    </TabsTrigger>
                    <TabsTrigger value="notifications" className="gap-2">
                      <Bell className="h-4 w-4" />
                      Notifications
                    </TabsTrigger>
                    <TabsTrigger value="profile" className="gap-2">
                      <User className="h-4 w-4" />
                      Profile
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="settings" className="mt-4">
                    <div className="rounded-lg border border-border p-4">
                      <p className="text-sm text-muted-foreground">Settings panel content.</p>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>

              <div className="space-y-4">
                <p className="text-sm font-medium text-foreground">Underline Style Tabs</p>
                <Tabs defaultValue="details" className="w-full">
                  <TabsList className="bg-transparent border-b border-border rounded-none w-full justify-start gap-4 px-0">
                    {['details', 'activity', 'related'].map(tab => (
                      <TabsTrigger
                        key={tab}
                        value={tab}
                        className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent shadow-none capitalize"
                      >
                        {tab}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  <TabsContent value="details" className="mt-4">
                    <div className="p-4">
                      <p className="text-sm text-muted-foreground">
                        Details with underline style tabs.
                      </p>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Selects */}
        <section className="space-y-8">
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Selects</h2>
            <p className="text-muted-foreground">Dropdown selection controls.</p>
          </div>

          <Card>
            <CardContent className="pt-6 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <Label>Basic Select</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a theme" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="castle">Castle & Medieval</SelectItem>
                      <SelectItem value="city">City & Modular</SelectItem>
                      <SelectItem value="trains">Trains</SelectItem>
                      <SelectItem value="nature">Nature</SelectItem>
                      <SelectItem value="vehicles">Vehicles</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>With Default Value</Label>
                  <Select defaultValue="city">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="castle">Castle & Medieval</SelectItem>
                      <SelectItem value="city">City & Modular</SelectItem>
                      <SelectItem value="trains">Trains</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Grouped Options</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Classic Themes</SelectLabel>
                        <SelectItem value="castle">Castle</SelectItem>
                        <SelectItem value="pirates">Pirates</SelectItem>
                        <SelectItem value="space">Space</SelectItem>
                      </SelectGroup>
                      <SelectGroup>
                        <SelectLabel>Modern Themes</SelectLabel>
                        <SelectItem value="city">City</SelectItem>
                        <SelectItem value="technic">Technic</SelectItem>
                        <SelectItem value="creator">Creator</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Disabled Select</Label>
                  <Select disabled>
                    <SelectTrigger>
                      <SelectValue placeholder="Disabled" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="option">Option</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-sm font-medium text-foreground">Select Sizes</p>
                <div className="flex flex-wrap items-end gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs">Small</Label>
                    <Select>
                      <SelectTrigger className="h-8 text-xs w-[140px]">
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Option 1</SelectItem>
                        <SelectItem value="2">Option 2</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Default</Label>
                    <Select>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Option 1</SelectItem>
                        <SelectItem value="2">Option 2</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Large</Label>
                    <Select>
                      <SelectTrigger className="h-12 text-base w-[220px]">
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Option 1</SelectItem>
                        <SelectItem value="2">Option 2</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Text Inputs */}
        <section className="space-y-8">
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Text Inputs</h2>
            <p className="text-muted-foreground">Form input fields for text entry.</p>
          </div>

          <Card>
            <CardContent className="pt-6 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <Label htmlFor="basic">Basic Input</Label>
                  <Input id="basic" placeholder="Enter text..." />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="with-value">With Value</Label>
                  <Input id="with-value" defaultValue="Castle Keep MOC" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="disabled">Disabled Input</Label>
                  <Input id="disabled" placeholder="Disabled" disabled />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="readonly">Read-only Input</Label>
                  <Input id="readonly" value="Read-only value" readOnly className="bg-muted" />
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-sm font-medium text-foreground">Input Types</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" placeholder="you@example.com" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input id="password" type="password" placeholder="Enter password" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="number">Number</Label>
                    <Input id="number" type="number" placeholder="0" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="date">Date</Label>
                    <Input id="date" type="date" />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-sm font-medium text-foreground">Input with Icons</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Search Input</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input placeholder="Search MOCs..." className="pl-10" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Input with Button</Label>
                    <div className="flex gap-2">
                      <Input placeholder="Enter URL..." className="flex-1" />
                      <Button>Go</Button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-sm font-medium text-foreground">Input States</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Default</Label>
                    <Input placeholder="Default state" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-destructive">Error</Label>
                    <Input
                      placeholder="Error state"
                      className="border-destructive focus-visible:ring-destructive"
                    />
                    <p className="text-xs text-destructive">This field is required.</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-primary">Success</Label>
                    <Input
                      placeholder="Success state"
                      className="border-primary focus-visible:ring-primary"
                    />
                    <p className="text-xs text-primary">Looks good!</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-sm font-medium text-foreground">Input Sizes</p>
                <div className="flex flex-wrap items-end gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs">Small</Label>
                    <Input placeholder="Small" className="h-8 text-xs" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Default</Label>
                    <Input placeholder="Default" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Large</Label>
                    <Input placeholder="Large" className="h-12 text-base" />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-sm font-medium text-foreground">Textarea</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea id="description" placeholder="Enter a description..." rows={4} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes (Resizable)</Label>
                    <Textarea
                      id="notes"
                      placeholder="Add notes..."
                      className="min-h-[100px] resize-y"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-sm font-medium text-foreground">Input with Helper Text</p>
                <div className="max-w-md space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input id="username" placeholder="Enter username" />
                  <p className="text-xs text-muted-foreground">
                    Your username must be 3-20 characters and can only contain letters, numbers, and
                    underscores.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Dividers & Separators */}
        <section className="space-y-8">
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Dividers & Separators</h2>
            <p className="text-muted-foreground">Visual separations between content sections.</p>
          </div>

          <Card>
            <CardContent className="pt-6 space-y-8">
              <div className="space-y-4">
                <p className="text-sm font-medium text-foreground">Horizontal Separator</p>
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">Content above the separator</p>
                  <Separator />
                  <p className="text-sm text-muted-foreground">Content below the separator</p>
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-sm font-medium text-foreground">Separator with Text</p>
                <div className="relative">
                  <Separator />
                  <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-4 text-xs text-muted-foreground">
                    OR
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-sm font-medium text-foreground">Vertical Separator</p>
                <div className="flex items-center h-12 gap-4">
                  <span className="text-sm text-muted-foreground">Item 1</span>
                  <Separator orientation="vertical" />
                  <span className="text-sm text-muted-foreground">Item 2</span>
                  <Separator orientation="vertical" />
                  <span className="text-sm text-muted-foreground">Item 3</span>
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-sm font-medium text-foreground">Styled Dividers</p>
                <div className="space-y-4">
                  <div className="border-t border-dashed border-border" />
                  <p className="text-xs text-muted-foreground text-center">Dashed divider</p>
                  <div className="border-t-2 border-primary/30" />
                  <p className="text-xs text-muted-foreground text-center">
                    Colored divider (primary)
                  </p>
                  <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />
                  <p className="text-xs text-muted-foreground text-center">Gradient fade divider</p>
                  <div className="h-px bg-gradient-to-r from-primary via-accent to-destructive" />
                  <p className="text-xs text-muted-foreground text-center">
                    Gradient colored divider
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-sm font-medium text-foreground">Section Divider</p>
                <div className="flex items-center gap-4">
                  <Separator className="flex-1" />
                  <span className="text-sm font-medium text-foreground">Section Title</span>
                  <Separator className="flex-1" />
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Alerts & Feedback */}
        <section className="space-y-8">
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Alerts & Feedback</h2>
            <p className="text-muted-foreground">Status messages and notifications.</p>
          </div>

          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 rounded-lg bg-primary/10 border border-primary/20">
              <Check className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium text-foreground">Success</p>
                <p className="text-sm text-muted-foreground">
                  Your changes have been saved successfully.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 rounded-lg bg-accent/10 border border-accent/20">
              <Info className="h-5 w-5 text-accent mt-0.5" />
              <div>
                <p className="font-medium text-foreground">Information</p>
                <p className="text-sm text-muted-foreground">
                  This is an informational message for the user.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/20">
              <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
              <div>
                <p className="font-medium text-foreground">Error</p>
                <p className="text-sm text-muted-foreground">
                  Something went wrong. Please try again.
                </p>
              </div>
            </div>
          </div>
        </section>

        <footer className="border-t border-border pt-8">
          <p className="text-center text-sm text-muted-foreground">Dark Academia Design System</p>
        </footer>
      </main>
    </div>
  )
}
