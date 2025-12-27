/**
 * Instructions Edit Module
 * Story 3.1.39: Edit Routes & Entry Points
 *
 * Lazy-loads the edit page and handles MOC fetching with ownership checks.
 * Implements auth guard and owner validation.
 */

import { lazy, Suspense, useEffect, useState } from 'react'
import { useNavigate, useParams } from '@tanstack/react-router'
import { z } from 'zod'
import { logger } from '@repo/logger'
import { LoadingPage } from '../pages/LoadingPage'

// Lazy-load the instructions edit page
const InstructionsEditPage = lazy(() =>
  import('../pages/InstructionsEditPage').then(module => ({
    default: module.InstructionsEditPage,
  })),
)

// Slug validation schema (AC: 6)
const SlugSchema = z.string().regex(/^[a-z0-9-]+$/, 'Invalid slug format')

// MOC detail type matching backend response
interface MocDetail {
  id: string
  title: string
  description: string | null
  slug: string | null
  tags: string[] | null
  theme: string | null
  status: 'draft' | 'published' | 'archived' | 'pending_review'
  isOwner: boolean
  files: Array<{
    id: string
    category: string
    filename: string
    url: string
  }>
}

// Mock fetch function - TODO: Replace with RTK Query
const fetchMocBySlug = async (slug: string): Promise<MocDetail | null> => {
  // Validate slug format
  const parseResult = SlugSchema.safeParse(slug)
  if (!parseResult.success) {
    logger.warn('Invalid slug format', { slug })
    return null
  }

  // TODO: Replace with actual API call using RTK Query
  // const { data, error } = useGetMocBySlugQuery(slug)

  // Mock data for development
  logger.info('Fetching MOC by slug (mock)', { slug })

  // Simulate API response
  return {
    id: '123e4567-e89b-12d3-a456-426614174001',
    title: 'Technic Supercar',
    description: 'A detailed supercar model with working steering and suspension.',
    slug: slug,
    tags: ['vehicle', 'supercar', 'advanced'],
    theme: 'Technic',
    status: 'draft',
    isOwner: true, // Mock: always owner for development
    files: [
      {
        id: 'file-1',
        category: 'instruction',
        filename: 'instructions.pdf',
        url: 'https://example.com/file.pdf',
      },
    ],
  }
}

/**
 * Instructions Edit Module - Wrapper for lazy-loaded edit page
 * Handles MOC fetching and ownership validation (AC: 5)
 */
export function InstructionsEditModule() {
  const navigate = useNavigate()
  const params = useParams({ from: '/mocs/$slug/edit' })
  const slug = params.slug

  const [moc, setMoc] = useState<MocDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch MOC data
  useEffect(() => {
    const loadMoc = async () => {
      if (!slug) {
        setError('No slug provided')
        setIsLoading(false)
        return
      }

      // Validate slug format (AC: 6)
      const parseResult = SlugSchema.safeParse(slug)
      if (!parseResult.success) {
        logger.warn('Invalid slug format', { slug })
        setError('Invalid MOC identifier')
        setIsLoading(false)
        return
      }

      try {
        const mocData = await fetchMocBySlug(slug)

        if (!mocData) {
          setError('MOC not found')
          setIsLoading(false)
          return
        }

        // Check ownership (AC: 5)
        if (!mocData.isOwner) {
          logger.info('Non-owner attempted to access edit page', { slug })
          // Redirect to detail page for non-owners
          navigate({ to: '/mocs/$slug', params: { slug } })
          return
        }

        setMoc(mocData)
        setError(null)
      } catch (err) {
        logger.error('Failed to fetch MOC for editing', { slug, error: err })
        setError('Failed to load MOC')
      } finally {
        setIsLoading(false)
      }
    }

    loadMoc()
  }, [slug, navigate])

  return (
    <Suspense fallback={<LoadingPage />}>
      <InstructionsEditPage moc={moc!} isLoading={isLoading} error={error} />
    </Suspense>
  )
}
