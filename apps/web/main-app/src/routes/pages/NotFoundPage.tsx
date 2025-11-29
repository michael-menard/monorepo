import { Link } from '@tanstack/react-router'
import { Button } from '@repo/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@repo/ui/card'
import { Home, ArrowLeft, Search } from 'lucide-react'

export function NotFoundPage() {
  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <Search className="h-8 w-8 text-muted-foreground" />
          </div>
          <CardTitle className="text-2xl">Page not found</CardTitle>
          <CardDescription>
            The page you're looking for doesn't exist or has been moved.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button asChild variant="outline" className="flex-1">
              <Link to="/">
                <Home className="mr-2 h-4 w-4" />
                Home
              </Link>
            </Button>
            <Button asChild className="flex-1" onClick={() => window.history.back()}>
              <span>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Go Back
              </span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
