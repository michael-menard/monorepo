import { useCallback } from 'react'
import { z } from 'zod'
import { useGetMocDetailQuery } from '@repo/api-client/rtk/instructions-api'
import type { GetMocDetailResponse } from '@repo/api-client'
import { createLogger } from '@repo/logger'
import { Skeleton } from '@repo/app-component-library'
import { MocDetailDashboard } from '../components/MocDetailDashboard/MocDetailDashboard'
import { MocSchema, type Moc } from '../components/MocDetailDashboard/__types__/moc'

const logger = createLogger('app-instructions-gallery:MocDetailModule')

const MocDetailModulePropsSchema = z.object({
  mocIdOrSlug: z.string().optional(),
})

export type MocDetailModuleProps = z.infer<typeof MocDetailModulePropsSchema>

/**
 * Map backend API response to frontend Moc type
 * Story INST-1101: View MOC Details
 */
function mapApiResponseToMoc(apiData: GetMocDetailResponse): Moc {
  // Separate files by type
  const instructionFiles = apiData.files.filter(f => f.fileType === 'instruction')
  const partsListFiles = apiData.files.filter(f => f.fileType === 'parts-list')
  const galleryFiles = apiData.files.filter(f => f.fileType === 'gallery-image')

  return {
    id: apiData.id,
    title: apiData.title,
    description: apiData.description || undefined,
    tags: apiData.tags || [],
    coverImageUrl: apiData.thumbnailUrl || '',
    instructionsPdfUrls: instructionFiles.map(f => f.downloadUrl),
    partsLists: partsListFiles.map(f => ({
      id: f.id,
      url: f.downloadUrl,
      filename: f.name,
    })),
    galleryImages: galleryFiles.map(f => ({
      id: f.id,
      url: f.downloadUrl,
    })),
    updatedAt: apiData.updatedAt.toISOString(),
    publishDate: apiData.createdAt.toISOString(),
    purchasedDate: undefined,
    author: undefined,
    partsCount: apiData.stats.pieceCount || 0,
    partsOwned: undefined,
    orders: [],
  }
}

export function MocDetailModule({ mocIdOrSlug }: MocDetailModuleProps) {
  const id = mocIdOrSlug ?? ''

  const { data, isLoading, isError, error, refetch } = useGetMocDetailQuery(id, {
    skip: !id,
  })

  const handleBack = useCallback(() => {
    window.history.back()
  }, [])

  if (!id) {
    return (
      <div className="container mx-auto py-6">
        <p className="text-sm text-destructive">No MOC specified.</p>
        <button type="button" onClick={handleBack} className="mt-4 text-sm text-primary underline">
          Back
        </button>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-80 w-full" />
      </div>
    )
  }

  if (isError || !data) {
    const message =
      error && error instanceof Error ? error.message : 'Failed to load MOC. Please try again.'

    logger.warn('Failed to load instruction detail for MOC dashboard', { id, error: message })

    return (
      <div className="container mx-auto py-6 space-y-4">
        <p className="text-destructive text-sm">{message}</p>
        <button type="button" onClick={() => refetch()} className="text-sm text-primary underline">
          Retry
        </button>
      </div>
    )
  }

  let moc: Moc

  try {
    const mapped = mapApiResponseToMoc(data)
    moc = MocSchema.parse(mapped)
  } catch (parseError) {
    logger.error('Failed to validate MOC detail data', undefined, { id, error: parseError })
    return (
      <div className="container mx-auto py-6 space-y-4">
        <p className="text-destructive text-sm">Invalid data received for this MOC.</p>
        <button type="button" onClick={handleBack} className="text-sm text-primary underline">
          Back
        </button>
      </div>
    )
  }

  return <MocDetailDashboard moc={moc} />
}
