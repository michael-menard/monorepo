/**
 * Instructions Edit Module
 * Story 3.1.39: Edit Routes & Entry Points
 * Story 3.1.40: Edit Page & Data Fetching
 *
 * Lazy-loads the edit page and handles MOC fetching with RTK Query.
 * Implements auth guard and owner validation.
 */

import { lazy, Suspense, useCallback, useEffect } from 'react'
import { useNavigate, useParams } from '@tanstack/react-router'
import { z } from 'zod'
import { logger } from '@repo/logger'
import { useGetMocForEditQuery } from '@repo/api-client/rtk/moc-api'
import { LoadingPage } from '../pages/LoadingPage'
import { EditPageSkeleton } from '../../components/MocEdit/EditPageSkeleton'
import { EditErrorDisplay } from '../../components/MocEdit/EditErrorDisplay'

// Lazy-load the instructions edit page
const InstructionsEditPage = lazy(() =>
  import('../pages/InstructionsEditPage').then(module => ({
    default: module.InstructionsEditPage,
  })),
)

// Slug validation schema (AC: 6)
const SlugSchema = z.string().regex(/^[a-z0-9-]+$/, 'Invalid slug format')

/**
 * Instructions Edit Module - Wrapper for lazy-loaded edit page
 * Story 3.1.40: Uses RTK Query for data fetching
 *
 * Handles:
 * - MOC fetching via RTK Query
 * - Ownership validation
 * - Loading states
 * - Error handling (404, 403, network)
 */
export function InstructionsEditModule() {
  const navigate = useNavigate()
  const params = useParams({ from: '/mocs/$slug/edit' })
  const slug = params.slug

  // Validate slug format before making API call
  const isValidSlug = slug ? SlugSchema.safeParse(slug).success : false

  // Fetch MOC data using RTK Query
  // Skip the query if slug is invalid to avoid unnecessary API calls
  const {
    data: moc,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useGetMocForEditQuery(slug || '', {
    skip: !isValidSlug,
  })

  // Handle retry for error states
  const handleRetry = useCallback(() => {
    refetch()
  }, [refetch])

  // Check ownership and redirect non-owners
  useEffect(() => {
    if (moc && !moc.isOwner) {
      logger.info('Non-owner attempted to access edit page', { slug })
      // Redirect to detail page for non-owners
      navigate({ to: '/mocs/$slug', params: { slug: slug! } })
    }
  }, [moc, slug, navigate])

  // Handle invalid slug format
  if (slug && !isValidSlug) {
    logger.warn('Invalid slug format', { slug })
    return (
      <EditErrorDisplay
        error={{ status: 400, data: { message: 'Invalid MOC identifier' } }}
        mocSlug={slug}
      />
    )
  }

  // Handle loading state
  if (isLoading || isFetching) {
    return (
      <Suspense fallback={<LoadingPage />}>
        <EditPageSkeleton />
      </Suspense>
    )
  }

  // Handle error state
  if (error) {
    return <EditErrorDisplay error={error} onRetry={handleRetry} mocSlug={slug} />
  }

  // Handle no data (shouldn't happen if no error, but defensive)
  if (!moc) {
    return (
      <EditErrorDisplay
        error={{ status: 404, data: { message: 'MOC not found' } }}
        mocSlug={slug}
      />
    )
  }

  // Handle non-owner (will redirect via useEffect, show loading while redirecting)
  if (!moc.isOwner) {
    return <LoadingPage />
  }

  // Render the edit page with fetched data
  return (
    <Suspense fallback={<EditPageSkeleton />}>
      <InstructionsEditPage moc={moc} />
    </Suspense>
  )
}
