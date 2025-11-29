import { LoadingSpinner } from '@repo/ui/loading-spinner'

interface LoadingPageProps {
  message?: string
}

export function LoadingPage({ message = 'Loading module...' }: LoadingPageProps) {
  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center space-y-4">
      <LoadingSpinner size="lg" />
      <p className="text-muted-foreground">{message}</p>
    </div>
  )
}
