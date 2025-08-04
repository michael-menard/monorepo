import { createContext, useContext, useEffect, useState } from 'react'
import { registerSW } from 'virtual:pwa-register'
import type { ReactNode } from 'react'

interface PWAContextType {
  needRefresh: boolean
  offlineReady: boolean
  updateServiceWorker: () => void
  closePrompt: () => void
  canInstall: boolean
  installPrompt: () => void
}

const PWAContext = createContext<PWAContextType | null>(null)

export const usePWA = () => {
  const context = useContext(PWAContext)
  if (!context) {
    throw new Error('usePWA must be used within a PWAProvider')
  }
  return context
}

interface PWAProviderProps {
  children: ReactNode
}

export const PWAProvider = ({ children }: PWAProviderProps) => {
  const [needRefresh, setNeedRefresh] = useState(false)
  const [offlineReady, setOfflineReady] = useState(false)
  const [canInstall, setCanInstall] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)

  useEffect(() => {
    // Register service worker
    const updateSW = registerSW({
      onNeedRefresh() {
        setNeedRefresh(true)
      },
      onOfflineReady() {
        setOfflineReady(true)
      },
      onRegistered(swRegistration: ServiceWorkerRegistration) {
        console.log('SW registered: ', swRegistration)
      },
      onRegisterError(error: Error) {
        console.log('SW registration error', error)
      }
    })

    // Handle PWA installation prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setCanInstall(true)
    }

    const handleAppInstalled = () => {
      setCanInstall(false)
      setDeferredPrompt(null)
      console.log('PWA was installed')
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const updateServiceWorker = () => {
    setNeedRefresh(false)
    setOfflineReady(false)
    // The updateSW function will be available from the registerSW call
    // This is handled by the Vite PWA plugin
  }

  const closePrompt = () => {
    setNeedRefresh(false)
    setOfflineReady(false)
  }

  const installPrompt = async () => {
    if (!deferredPrompt) return

    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt')
    } else {
      console.log('User dismissed the install prompt')
    }
    
    setDeferredPrompt(null)
    setCanInstall(false)
  }

  const value: PWAContextType = {
    needRefresh,
    offlineReady,
    updateServiceWorker,
    closePrompt,
    canInstall,
    installPrompt
  }

  return (
    <PWAContext.Provider value={value}>
      {children}
    </PWAContext.Provider>
  )
} 