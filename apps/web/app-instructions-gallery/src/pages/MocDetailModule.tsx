import { useCallback } from 'react'
import { z } from 'zod'
import { useGetInstructionByIdQuery } from '@repo/api-client/rtk/instructions-api'
import { createLogger } from '@repo/logger'
import { MocDetailDashboard } from '../components/MocDetailDashboard/MocDetailDashboard'
import { MocSchema } from '../components/MocDetailDashboard/__types__/moc'
import { Skeleton } from '@repo/app-component-library'

const logger = createLogger('app-instructions-gallery:MocDetailModule')

const MocDetailModulePropsSchema = z.object({
  mocIdOrSlug: z.string().optional(),
})

export type MocDetailModuleProps = z.infer<typeof MocDetailModulePropsSchema>

export function MocDetailModule({ mocIdOrSlug }: MocDetailModuleProps) {
  const id = mocIdOrSlug ?? ''

  const { data, isLoading, isError, error, refetch } = useGetInstructionByIdQuery(id, {
    skip: !id,
  })

  const handleBack = useCallback(() => {
    window.history.back()
  }, [])

  if (!id) {
    return (
      <div className="container mx-auto py-6">
        <p className="text-sm text-destructive">No MOC specified.</p>
        <button
          type="button"
          onClick={handleBack}
          className="mt-4 text-sm text-primary underline"
        >
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
      error && error instanceof Error
        ? error.message
        : 'Failed to load MOC. Please try again.'

    logger.warn('Failed to load instruction detail for MOC dashboard', { id, error: message })

    return (
      <div className="container mx-auto py-6 space-y-4">
        <p className="text-destructive text-sm">{message}</p>
        <button
          type="button"
          onClick={() => refetch()}
          className="text-sm text-primary underline"
        >
          Retry
        </button>
      </div>
    )
  }

  const api = data.data

  const mapped = {
    id: api.id,
    title: api.name,
    description: api.description,
    tags: api.tags,
    coverImageUrl: api.thumbnail,
    instructionsPdfUrls: api.pdfUrl ? [api.pdfUrl] : [],
    partsLists: [],
    galleryImages: (api.images || []).map((url, index) => ({
      id: `${api.id}-image-${index}`,
      url,
    })),
    updatedAt: api.updatedAt,
    publishDate: api.createdAt,
    purchasedDate: undefined,
    author: undefined,
    partsCount: api.pieceCount,
    partsOwned: 0,
    orders: [],
  }

  let moc

  try {
    moc = MocSchema.parse(mapped)
  } catch (parseError) {
    logger.error('Failed to validate MOC detail data', undefined, { id, error: parseError })
    return (
      <div className="container mx-auto py-6 space-y-4">
        <p className="text-destructive text-sm">Invalid data received for this MOC.</p>
        <button
          type="button"
          onClick={handleBack}
          className="text-sm text-primary underline"
        >
          Back
        </button>
      </div>
    )
  }

  return <MocDetailDashboard moc={moc} />
}
