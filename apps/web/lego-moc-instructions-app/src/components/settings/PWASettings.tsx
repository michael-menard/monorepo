import React from 'react'
import { Button } from '@repo/ui'
import { Download, RefreshCw, WifiOff, CheckCircle, AlertCircle, Smartphone } from 'lucide-react'
import { usePWA } from '../PWAProvider'
import { FormSection } from './FormSection'

export const PWASettings: React.FC = () => {
  const { needRefresh, offlineReady, updateServiceWorker, canInstall, installPrompt } = usePWA()

  // Check if app is already installed (running in standalone mode)
  const isInstalled =
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true

  return (
    <div className="space-y-6">
      {/* App Installation Section */}
      <FormSection
        title="App Installation"
        description="Install this app on your device for a native app experience"
      >
        <div className="space-y-4">
          {isInstalled ? (
            <div className="flex items-center space-x-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
              <div>
                <p className="font-medium text-green-800 dark:text-green-200">App Installed</p>
                <p className="text-sm text-green-600 dark:text-green-300">
                  The app is installed and running in standalone mode.
                </p>
              </div>
            </div>
          ) : canInstall ? (
            <div className="space-y-3">
              <div className="flex items-center space-x-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <Smartphone className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-medium text-blue-800 dark:text-blue-200">Ready to Install</p>
                  <p className="text-sm text-blue-600 dark:text-blue-300">
                    Install this app on your device for faster access and a better experience.
                  </p>
                </div>
              </div>
              <Button onClick={installPrompt} className="w-full sm:w-auto">
                <Download className="h-4 w-4 mr-2" />
                Install App
              </Button>
            </div>
          ) : (
            <div className="flex items-center space-x-3 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
              <AlertCircle className="h-5 w-5 text-gray-500 flex-shrink-0" />
              <div>
                <p className="font-medium text-gray-700 dark:text-gray-300">
                  Installation Not Available
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  App installation is not available on this device or browser.
                </p>
              </div>
            </div>
          )}
        </div>
      </FormSection>

      {/* App Updates Section */}
      {needRefresh ? (
        <FormSection
          title="App Update Available"
          description="A new version of the app is ready to install"
        >
          <div className="space-y-3">
            <div className="flex items-center space-x-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <RefreshCw className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-medium text-blue-800 dark:text-blue-200">Update Available</p>
                <p className="text-sm text-blue-600 dark:text-blue-300">
                  A new version with the latest features and improvements is ready.
                </p>
              </div>
            </div>
            <Button onClick={updateServiceWorker} className="w-full sm:w-auto">
              <RefreshCw className="h-4 w-4 mr-2" />
              Update Now
            </Button>
          </div>
        </FormSection>
      ) : null}

      {/* Offline Status Section */}
      <FormSection
        title="Offline Support"
        description="App functionality when you're not connected to the internet"
      >
        <div className="space-y-3">
          {offlineReady ? (
            <div className="flex items-center space-x-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
              <div>
                <p className="font-medium text-green-800 dark:text-green-200">
                  Ready for Offline Use
                </p>
                <p className="text-sm text-green-600 dark:text-green-300">
                  The app has been cached and will work even when you're offline.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center space-x-3 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <WifiOff className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
              <div>
                <p className="font-medium text-yellow-800 dark:text-yellow-200">
                  Setting Up Offline Support
                </p>
                <p className="text-sm text-yellow-600 dark:text-yellow-300">
                  The app is being prepared for offline use. This will complete automatically.
                </p>
              </div>
            </div>
          )}
        </div>
      </FormSection>

      {/* PWA Features Info */}
      <FormSection title="Progressive Web App Features" description="Benefits of using this app">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex items-start space-x-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
            <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-sm">Fast Loading</p>
              <p className="text-xs text-muted-foreground">Cached for instant access</p>
            </div>
          </div>
          <div className="flex items-start space-x-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
            <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-sm">Offline Access</p>
              <p className="text-xs text-muted-foreground">Works without internet</p>
            </div>
          </div>
          <div className="flex items-start space-x-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
            <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-sm">Native Feel</p>
              <p className="text-xs text-muted-foreground">App-like experience</p>
            </div>
          </div>
          <div className="flex items-start space-x-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
            <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-sm">Auto Updates</p>
              <p className="text-xs text-muted-foreground">Always up to date</p>
            </div>
          </div>
        </div>
      </FormSection>
    </div>
  )
}

export default PWASettings
