/**
 * Edit Page Skeleton
 *
 * Story 3.1.40: Loading skeleton for the edit page.
 * Displays placeholder content while MOC data is being fetched.
 */

import { Skeleton, Card, CardHeader, CardContent } from '@repo/app-component-library'

/**
 * Edit Page Skeleton Component
 * Story 3.1.40: Edit Page & Data Fetching
 *
 * Matches the layout of InstructionsEditPage to provide
 * a smooth loading experience.
 */
export function EditPageSkeleton() {
  return (
    <div className="container max-w-4xl mx-auto py-8 px-4" data-testid="edit-page-skeleton">
      {/* Header skeleton */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          {/* Back button skeleton */}
          <Skeleton className="h-10 w-10" />
          <div>
            {/* Title skeleton */}
            <Skeleton className="h-8 w-32 mb-2" />
            {/* Subtitle skeleton */}
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
        {/* Save button skeleton */}
        <Skeleton className="h-10 w-32" />
      </div>

      {/* Form skeleton */}
      <div className="space-y-6">
        {/* Basic Information Card */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40 mb-2" />
            <Skeleton className="h-4 w-56" />
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Title field */}
            <div className="space-y-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-10 w-full" />
            </div>

            {/* Description field */}
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>

            {/* Theme field */}
            <div className="space-y-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-10 w-full" />
            </div>

            {/* Tags field */}
            <div className="space-y-2">
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-10 w-full" />
            </div>
          </CardContent>
        </Card>

        {/* Files Card */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-16 mb-2" />
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {/* File items skeleton */}
              {[1, 2, 3].map(i => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded" />
                    <div className="space-y-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                  <Skeleton className="h-8 w-20" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
