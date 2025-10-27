import { Button } from '@repo/ui'
import { ArrowLeft, Home, RefreshCw, WifiOff } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'

interface OfflineFallbackProps {
  title?: string
  message?: string
  showRetry?: boolean
  showHome?: boolean
  onRetry?: () => void
}

export const OfflineFallback = ({
  title = 'You are offline',
  message = 'This content is not available offline. Please check your connection and try again.',
  showRetry = true,
  showHome = true,
  onRetry,
}: OfflineFallbackProps) => {
  const navigate = useNavigate()

  const handleRetry = () => {
    if (onRetry) {
      onRetry()
    } else {
      window.location.reload()
    }
  }

  const handleGoHome = () => {
    navigate({ to: '/' })
  }

  const handleGoBack = () => {
    navigate({ to: '..' })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full text-center">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="flex justify-center mb-6">
            <div className="bg-red-100 rounded-full p-4">
              <WifiOff className="h-8 w-8 text-red-600" />
            </div>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-4">{title}</h1>

          <p className="text-gray-600 mb-8">{message}</p>

          <div className="space-y-3">
            {showRetry ? (
              <Button onClick={handleRetry} className="w-full" variant="default">
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            ) : null}

            <div className="flex space-x-3">
              <Button onClick={handleGoBack} variant="outline" className="flex-1">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Go Back
              </Button>

              {showHome ? (
                <Button onClick={handleGoHome} variant="outline" className="flex-1">
                  <Home className="h-4 w-4 mr-2" />
                  Home
                </Button>
              ) : null}
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              Some features may be limited while offline. Your changes will sync when you're back
              online.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
