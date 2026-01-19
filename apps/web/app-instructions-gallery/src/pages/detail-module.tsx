import { useCallback } from 'react'
import { useGetInstructionByIdQuery } from '@repo/api-client/rtk/instructions-api'
import type { Instruction } from '../__types__'
import { DetailPage } from './detail-page'

interface DetailPageModuleProps {
  mocIdOrSlug?: string
}

/**
 * DetailPageModule
 *
 * Thin wrapper that fetches instruction data via RTK Query and renders DetailPage.
 * For now it assumes mocIdOrSlug is an instruction ID; slug-based lookup can be
 * added later if needed.
 */
export function DetailPageModule({ mocIdOrSlug }: DetailPageModuleProps) {
  const id = mocIdOrSlug ?? ''

  const { data, isLoading, isError, error } = useGetInstructionByIdQuery(id, {
    skip: !id,
  })

  const handleBack = useCallback(() => {
    // Host app can override via Module props in the future; for now fall back to history
    window.history.back()
  }, [])

  if (!id) {
    return <DetailPage instruction={null} error="No instruction specified" onBack={handleBack} />
  }

  if (isLoading) {
    return <DetailPage instruction={null} isLoading onBack={handleBack} />
  }

  if (isError || !data) {
    const message =
      error && error instanceof Error
        ? error.message
        : 'Failed to load instruction. Please try again.'

    return <DetailPage instruction={null} error={message} onBack={handleBack} />
  }

  // Map API Instruction (api-responses.ts) to local Instruction type (__types__/index.ts)
  const api = data.data
  const instruction: Instruction = {
    id: api.id,
    name: api.name,
    description: api.description,
    thumbnail: api.thumbnail,
    images: api.images ?? [],
    pieceCount: api.pieceCount,
    theme: api.theme,
    tags: api.tags,
    pdfUrl: api.pdfUrl,
    createdAt: api.createdAt,
    updatedAt: api.updatedAt,
    isFavorite: api.isFavorite,
  }

  return <DetailPage instruction={instruction} onBack={handleBack} />
}
