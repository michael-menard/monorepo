/**
 * AppWishlistGallery Main Page
 *
 * The primary page component for the App Wishlist Gallery module.
 */
import { z } from 'zod'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@repo/app-component-library'
import { LoadingSpinner } from '@repo/app-component-library'

/**
 * Main page props schema
 */
const MainPagePropsSchema = z.object({
  /** Optional className for styling */
  className: z.string().optional(),
})

export type MainPageProps = z.infer<typeof MainPagePropsSchema>

/**
 * Main Page Component
 *
 * This is the primary content page for the App Wishlist Gallery module.
 */
export function MainPage({ className }: MainPageProps) {
  return (
    <div className={className}>
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">App Wishlist Gallery</h1>
          <p className="text-muted-foreground">Welcome to the App Wishlist Gallery module.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Getting Started</CardTitle>
            <CardDescription>Customize this module to build your feature</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>
                Edit <code className="bg-muted px-1 rounded">src/pages/main-page.tsx</code> to
                customize this page
              </li>
              <li>
                Add new pages in the <code className="bg-muted px-1 rounded">src/pages</code>{' '}
                directory
              </li>
              <li>
                Create reusable components in{' '}
                <code className="bg-muted px-1 rounded">src/components</code>
              </li>
              <li>
                Import from <code className="bg-muted px-1 rounded">@repo/*</code> packages for
                shared functionality
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default MainPage
