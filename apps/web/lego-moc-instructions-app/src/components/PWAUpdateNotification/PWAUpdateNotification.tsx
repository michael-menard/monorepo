import { Button } from '@repo/ui'
import { Download, RefreshCw, WifiOff, X } from 'lucide-react'
import { usePWA } from '../PWAProvider'

export const PWAUpdateNotification = () => {
  const { needRefresh, offlineReady, updateServiceWorker, closePrompt, canInstall, installPrompt } =
    usePWA()

  if (!needRefresh && !offlineReady && !canInstall) {
    return null
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm">
      {needRefresh ? (
        <div className="bg-blue-600 text-white p-4 rounded-lg shadow-lg mb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <RefreshCw className="h-5 w-5" />
              <span className="font-medium">New version available</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={closePrompt}
              className="text-white hover:bg-blue-700"
              aria-label="Close update"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-sm mt-2 mb-3">
            A new version of the app is available. Update to get the latest features.
          </p>
          <div className="flex space-x-2">
            <Button
              onClick={updateServiceWorker}
              className="bg-white text-blue-600 hover:bg-gray-100"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Update
            </Button>
            <Button
              variant="outline"
              onClick={closePrompt}
              className="border-white text-white hover:bg-blue-700"
            >
              Later
            </Button>
          </div>
        </div>
      ) : null}

      {offlineReady ? (
        <div className="bg-green-600 text-white p-4 rounded-lg shadow-lg mb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <WifiOff className="h-5 w-5" />
              <span className="font-medium">Ready for offline use</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={closePrompt}
              className="text-white hover:bg-green-700"
              aria-label="Close offline"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-sm mt-2">The app is now ready to work offline.</p>
        </div>
      ) : null}

      {canInstall ? (
        <div className="bg-purple-600 text-white p-4 rounded-lg shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Download className="h-5 w-5" />
              <span className="font-medium">Install App</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={closePrompt}
              className="text-white hover:bg-purple-700"
              aria-label="Close install"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-sm mt-2 mb-3">
            Install this app on your device for a better experience.
          </p>
          <div className="flex space-x-2">
            <Button onClick={installPrompt} className="bg-white text-purple-600 hover:bg-gray-100">
              <Download className="h-4 w-4 mr-2" />
              Install
            </Button>
            <Button
              variant="outline"
              onClick={closePrompt}
              className="border-white text-white hover:bg-purple-700"
            >
              Not now
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
