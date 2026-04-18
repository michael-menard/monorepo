/**
 * Minifigs Module
 *
 * Lazy-loads @repo/app-minifigs-gallery micro-app.
 * Shell controls routing — micro app receives mode + navigation callback.
 */

import { lazy, Suspense } from 'react'
import { useNavigate, useParams } from '@tanstack/react-router'
import { LoadingPage } from '../pages/LoadingPage'

const MinifigsGalleryModule = lazy(() => import('@repo/app-minifigs-gallery'))

export function MinifigsModule() {
  const navigate = useNavigate()

  return (
    <Suspense fallback={<LoadingPage />}>
      <MinifigsGalleryModule mode="gallery" onNavigate={(path: string) => navigate({ to: path })} />
    </Suspense>
  )
}

export function MinifigsDetailModule() {
  const { minifigId } = useParams({ from: '/minifigs/$minifigId' })
  const navigate = useNavigate()

  return (
    <Suspense fallback={<LoadingPage />}>
      <MinifigsGalleryModule
        mode="detail"
        minifigId={minifigId}
        onNavigate={(path: string) => navigate({ to: path })}
      />
    </Suspense>
  )
}
