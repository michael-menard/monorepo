/**
 * Instructions Gallery Main Page
 *
 * The primary page component for browsing MOC instruction collection.
 * Story 3.1.1: Instructions Gallery Page Scaffolding
 */
import { BookOpen } from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@repo/app-component-library'

export interface MainPageProps {
  className?: string
}

/**
 * Main Page Component
 *
 * Displays the Instructions Gallery with header and grid area.
 * Grid content and filtering will be added in subsequent stories.
 */
export function MainPage({ className }: MainPageProps) {
  return (
    <div className={className}>
      <div className="container mx-auto py-6 space-y-6">
        {/* Page Header */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="h-7 w-7 text-primary" />
            My Instructions
          </h1>
          <p className="text-muted-foreground">Browse your MOC instruction collection</p>
        </div>

        {/* Grid Area - placeholder for GalleryGrid component */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {/* Empty state placeholder */}
          <Card className="col-span-full">
            <CardHeader className="text-center">
              <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
              <CardTitle>No instructions yet</CardTitle>
              <CardDescription>
                Upload your first MOC instructions to start your collection.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-sm text-muted-foreground">
                Gallery components from @repo/gallery will be integrated in Story 3.0.x
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default MainPage
