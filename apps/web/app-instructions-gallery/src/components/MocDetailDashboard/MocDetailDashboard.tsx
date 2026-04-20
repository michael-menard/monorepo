import { useCallback, useState, useEffect } from 'react'
import { useDispatch } from 'react-redux'
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Card,
  CardContent,
} from '@repo/app-component-library'
import { instructionsApi } from '@repo/api-client/rtk/instructions-api'
import { Calendar, User, ExternalLink } from 'lucide-react'
import type { BuildStatus } from '@repo/api-client/schemas/instructions'
import type { Moc } from './__types__/moc'
import { MetaCard } from './MetaCard'
import { CoverImagePicker } from './CoverImagePicker'
import { StatsCard } from './StatsCard'
import { PartsGauge } from './PartsGauge'
import { PartsListsCard } from './PartsListsCard'
import { InstructionsCard } from './InstructionsCard'
import { OrdersCard } from './OrdersCard'
import { GalleryCard as ImageGridCard } from './GalleryCard'
import { DescriptionCard } from './DescriptionCard'
import { TagsSection } from './TagsSection'
import { DimensionsSection } from './DimensionsSection'
import { NotesCard } from './NotesCard'
import { RatingsSection } from './RatingsSection'
import { BuildStatusBadge } from './BuildStatusBadge'
import { CompletionModal } from './CompletionModal'
import { BuildReviewModal } from './BuildReviewModal'
import { ReviewCard } from './ReviewCard'

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
  const dispatch = useDispatch()
  const [showCompletionModal, setShowCompletionModal] = useState(false)
  const [showReviewModal, setShowReviewModal] = useState(false)

  const handleFilesUploaded = useCallback(() => {
    dispatch(instructionsApi.util.invalidateTags([{ type: 'Moc', id: moc.id }]))
  }, [dispatch, moc.id])

  // Show completion modal on page load if build is complete with no review and not skipped
  useEffect(() => {
    if (moc.buildStatus === 'complete' && moc.reviewStatus === 'none' && !moc.reviewSkippedAt) {
      setShowCompletionModal(true)
    }
  }, [moc.buildStatus, moc.reviewStatus, moc.reviewSkippedAt])

  const handleStatusChange = useCallback((newStatus: BuildStatus) => {
    if (newStatus === 'complete') {
      setShowCompletionModal(true)
    }
  }, [])

  const handleReviewNow = useCallback(() => {
    setShowCompletionModal(false)
    setShowReviewModal(true)
  }, [])

  const hasReview = moc.reviewStatus === 'complete' || moc.reviewStatus === 'draft'

  return (
    <div className="container mx-auto px-4 py-6 xl:py-8" data-testid="moc-detail-dashboard">
      <CompletionModal
        mocId={moc.id}
        open={showCompletionModal}
        onClose={() => setShowCompletionModal(false)}
        onReviewNow={handleReviewNow}
      />
      <BuildReviewModal
        mocId={moc.id}
        open={showReviewModal}
        onClose={() => setShowReviewModal(false)}
      />
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
        <aside className="lg:col-span-4 xl:col-span-3 space-y-6 lg:sticky lg:top-20 lg:self-start">
          <CoverImagePicker
            mocId={moc.id}
            coverImageUrl={moc.coverImageUrl}
            title={moc.title}
            galleryImages={moc.galleryImages}
          />
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
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
                  <dt className="text-muted-foreground">Added</dt>
                  <dd className="font-medium text-foreground">
                    {moc.addedDate ? formatDate(moc.addedDate) : '--'}
                  </dd>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
                  <dt className="text-muted-foreground">Published</dt>
                  <dd className="font-medium text-foreground">
                    {moc.publishedDate ? formatDate(moc.publishedDate) : '--'}
                  </dd>
                </div>
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
                    <dd className="font-medium text-foreground">{formatDate(moc.purchasedDate)}</dd>
                  </div>
                ) : null}
              </dl>
              <DimensionsSection mocId={moc.id} dimensions={moc.dimensions} />
              <RatingsSection
                mocId={moc.id}
                ratings={moc.ratings}
                readOnly={moc.reviewStatus === 'complete'}
              />
              <TagsSection mocId={moc.id} tags={moc.tags} />
            </CardContent>
          </Card>
        </aside>

        <main className="lg:col-span-8 xl:col-span-9 space-y-6">
          <div className="flex items-center gap-3">
            <MetaCard moc={{ id: moc.id, title: moc.title }} />
            <BuildStatusBadge
              mocId={moc.id}
              buildStatus={moc.buildStatus}
              onStatusChange={handleStatusChange}
            />
          </div>
          <StatsCard
            partsCount={moc.partsCount}
            galleryCount={moc.galleryImages.length}
            instructionsCount={moc.instructionsPdfUrls.length}
            partsListsCount={moc.partsLists.length}
          />
          <Tabs defaultValue="description">
            <TabsList className={`grid w-full ${hasReview ? 'grid-cols-7' : 'grid-cols-6'}`}>
              <TabsTrigger value="description">Description</TabsTrigger>
              <TabsTrigger value="gallery">Gallery</TabsTrigger>
              <TabsTrigger value="instructions">Instructions</TabsTrigger>
              <TabsTrigger value="notes">Notes</TabsTrigger>
              <TabsTrigger value="parts-lists">Parts Lists</TabsTrigger>
              <TabsTrigger value="parts-orders">Parts Orders</TabsTrigger>
              {hasReview && <TabsTrigger value="review">Review</TabsTrigger>}
            </TabsList>
            <TabsContent value="description">
              <DescriptionCard mocId={moc.id} description={moc.description} />
            </TabsContent>
            <TabsContent value="gallery">
              <ImageGridCard galleryImages={moc.galleryImages} />
            </TabsContent>
            <TabsContent value="instructions">
              <InstructionsCard
                mocId={moc.id}
                instructionsPdfUrls={moc.instructionsPdfUrls}
                instructionFiles={moc.instructionFiles}
                coverImageUrl={moc.coverImageUrl || undefined}
                onFilesUploaded={handleFilesUploaded}
              />
            </TabsContent>
            <TabsContent value="notes">
              <NotesCard mocId={moc.id} notes={moc.notes} />
            </TabsContent>
            <TabsContent value="parts-lists">
              <PartsListsCard partsLists={moc.partsLists} />
            </TabsContent>
            <TabsContent value="parts-orders" className="space-y-6">
              <PartsGauge partsOwned={moc.partsOwned ?? 0} partsTotal={moc.partsCount ?? 0} />
              <OrdersCard orders={moc.orders} />
            </TabsContent>
            {hasReview && (
              <TabsContent value="review">
                <ReviewCard mocId={moc.id} onEdit={() => setShowReviewModal(true)} />
              </TabsContent>
            )}
          </Tabs>
        </main>
      </div>
    </div>
  )
}
