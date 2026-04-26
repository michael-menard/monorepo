import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { useGetInstructionsQuery } from '@repo/api-client/rtk/instructions-api'
import type { Instruction } from '../__types__'

const LIMIT = 100

function mapApiItem(api: any): Instruction {
  return {
    id: api.id,
    name: api.title,
    description: api.description ?? undefined,
    thumbnail: api.thumbnailUrl ?? '',
    images: [],
    pieceCount: api.partsCount ?? 0,
    theme: api.theme ?? '',
    tags: api.tags ?? [],
    pdfUrl: undefined,
    createdAt: typeof api.createdAt === 'string' ? api.createdAt : String(api.createdAt),
    updatedAt: api.updatedAt
      ? typeof api.updatedAt === 'string'
        ? api.updatedAt
        : String(api.updatedAt)
      : undefined,
    isFavorite: api.isFeatured,
    wantToBuild: api.wantToBuild ?? false,
  }
}

interface GalleryState {
  instructions: Instruction[]
  setInstructions: React.Dispatch<React.SetStateAction<Instruction[]>>
  accumulatedRef: React.MutableRefObject<Map<string, Instruction>>
  searchTerm: string
  setSearchTerm: (term: string) => void
  currentPage: number
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>
  totalPages: number
  hasMore: boolean
  isLoading: boolean
  isLoadingMore: boolean
  isError: boolean
  error: unknown
  refetch: () => void
  handleLoadMore: () => void
  scrollY: React.MutableRefObject<number>
}

const GalleryStateContext = createContext<GalleryState | null>(null)

export function GalleryStateProvider({ children }: { children: React.ReactNode }) {
  const [instructions, setInstructions] = useState<Instruction[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const accumulatedRef = useRef<Map<string, Instruction>>(new Map())
  const scrollY = useRef(0)

  const { data, isLoading, isError, error, refetch } = useGetInstructionsQuery({
    page: currentPage,
    limit: LIMIT,
  })

  useEffect(() => {
    if (!data) return
    setTotalPages(data.pagination.totalPages)
    data.items.forEach(api => {
      accumulatedRef.current.set(api.id, mapApiItem(api))
    })
    setInstructions(Array.from(accumulatedRef.current.values()))
  }, [data])

  const hasMore = currentPage < totalPages
  const isLoadingMore = isLoading && currentPage > 1

  const handleLoadMore = useCallback(() => {
    if (hasMore && !isLoading) setCurrentPage(p => p + 1)
  }, [hasMore, isLoading])

  return (
    <GalleryStateContext.Provider
      value={{
        instructions,
        setInstructions,
        accumulatedRef,
        searchTerm,
        setSearchTerm,
        currentPage,
        setCurrentPage,
        totalPages,
        hasMore,
        isLoading,
        isLoadingMore,
        isError,
        error,
        refetch,
        handleLoadMore,
        scrollY,
      }}
    >
      {children}
    </GalleryStateContext.Provider>
  )
}

export function useGalleryState(): GalleryState {
  const ctx = useContext(GalleryStateContext)
  if (!ctx) throw new Error('useGalleryState must be used within GalleryStateProvider')
  return ctx
}
