import { lazy, Suspense } from 'react'
import { LoadingPage } from '../pages/LoadingPage'

const AppScraperQueueModule = lazy(() =>
  import('@repo/app-scraper-queue').then(module => ({ default: module.AppScraperQueueModule })),
)

export function ScraperModule() {
  return (
    <Suspense fallback={<LoadingPage />}>
      <AppScraperQueueModule />
    </Suspense>
  )
}
