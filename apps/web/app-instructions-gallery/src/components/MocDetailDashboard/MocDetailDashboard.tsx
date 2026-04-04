import { useCallback } from 'react'
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  AppBadge as Badge,
  Card,
  CardContent,
} from '@repo/app-component-library'
import { Calendar, User, ExternalLink } from 'lucide-react'
import type { Moc } from './__types__/moc'
import { CoverCard } from './CoverCard'
import { MetaCard } from './MetaCard'
import { StatsCard } from './StatsCard'
import { PartsGauge } from './PartsGauge'
import { PartsListsCard } from './PartsListsCard'
import { InstructionsCard } from './InstructionsCard'
import { OrdersCard } from './OrdersCard'
import { GalleryCard } from './GalleryCard'
import { DescriptionCard } from './DescriptionCard'

function formatDate(isoDate: string): string {
  try {
    return new Date(isoDate).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return isoDate
  }
}

interface MocDetailDashboardProps {
  moc: Moc
}

export function MocDetailDashboard({ moc }: MocDetailDashboardProps) {
  const handleFilesUploaded = useCallback(() => {}, [])

  return (
    <div className="container mx-auto px-4 py-6 xl:py-8" data-testid="moc-detail-dashboard">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
        <aside className="lg:col-span-4 xl:col-span-3 space-y-6 lg:sticky lg:top-20 lg:self-start">
          <CoverCard moc={{ title: moc.title, coverImageUrl: moc.coverImageUrl }} />
          {moc.author ||
          moc.publishDate ||
          moc.updatedAt ||
          moc.purchasedDate ||
          (moc.tags ?? []).length > 0 ? (
            <Card className="border-border shadow-sm">
              <CardContent className="p-4 space-y-3">
                {moc.author ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <User className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>By</span>
                    {moc.author.url ? (
                      <a
                        href={moc.author.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                      >
                        {moc.author.displayName}
                        <ExternalLink className="h-3 w-3" aria-hidden="true" />
                      </a>
                    ) : (
                      <span className="font-medium text-foreground">{moc.author.displayName}</span>
                    )}
                  </div>
                ) : null}
                <dl className="space-y-1.5 text-sm">
                  {moc.publishDate ? (
                    <div className="flex items-center gap-2">
                      <Calendar
                        className="h-4 w-4 text-muted-foreground shrink-0"
                        aria-hidden="true"
                      />
                      <dt className="text-muted-foreground">Published</dt>
                      <dd className="font-medium text-foreground">{formatDate(moc.publishDate)}</dd>
                    </div>
                  ) : null}
                  {moc.updatedAt ? (
                    <div className="flex items-center gap-2">
                      <Calendar
                        className="h-4 w-4 text-muted-foreground shrink-0"
                        aria-hidden="true"
                      />
                      <dt className="text-muted-foreground">Updated</dt>
                      <dd className="font-medium text-foreground">{formatDate(moc.updatedAt)}</dd>
                    </div>
                  ) : null}
                  {moc.purchasedDate ? (
                    <div className="flex items-center gap-2">
                      <Calendar
                        className="h-4 w-4 text-muted-foreground shrink-0"
                        aria-hidden="true"
                      />
                      <dt className="text-muted-foreground">Purchased</dt>
                      <dd className="font-medium text-foreground">
                        {formatDate(moc.purchasedDate)}
                      </dd>
                    </div>
                  ) : null}
                </dl>
                {(moc.tags ?? []).length > 0 ? (
                  <div className="flex flex-wrap gap-1.5" role="list" aria-label="Tags">
                    {moc.tags.map(tag => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        role="listitem"
                        className="bg-sky-500/10 text-sky-700 dark:text-sky-300 hover:bg-sky-500/20 border-0 text-xs"
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ) : null}
        </aside>

        <main className="lg:col-span-8 xl:col-span-9 space-y-6">
          <MetaCard moc={{ id: moc.id, title: moc.title }} />
          <StatsCard
            partsCount={moc.partsCount}
            galleryCount={moc.galleryImages.length}
            instructionsCount={moc.instructionsPdfUrls.length}
            partsListsCount={moc.partsLists.length}
          />
          <Tabs defaultValue="description">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="description">Description</TabsTrigger>
              <TabsTrigger value="instructions">Instructions</TabsTrigger>
              <TabsTrigger value="gallery">Gallery</TabsTrigger>
              <TabsTrigger value="parts-lists">Parts Lists</TabsTrigger>
              <TabsTrigger value="parts-orders">Parts Orders</TabsTrigger>
            </TabsList>
            <TabsContent value="description">
              <DescriptionCard mocId={moc.id} description={moc.description} />
            </TabsContent>
            <TabsContent value="instructions">
              <InstructionsCard
                mocId={moc.id}
                instructionsPdfUrls={moc.instructionsPdfUrls}
                onFilesUploaded={handleFilesUploaded}
              />
            </TabsContent>
            <TabsContent value="gallery">
              <GalleryCard galleryImages={moc.galleryImages} />
            </TabsContent>
            <TabsContent value="parts-lists">
              <PartsListsCard partsLists={moc.partsLists} />
            </TabsContent>
            <TabsContent value="parts-orders" className="space-y-6">
              <PartsGauge partsOwned={moc.partsOwned ?? 0} partsTotal={moc.partsCount ?? 0} />
              <OrdersCard orders={moc.orders} />
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  )
}
