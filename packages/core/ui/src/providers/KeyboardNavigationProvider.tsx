import React, { createContext, useContext, ReactNode } from 'react'
import { useKeyboardNavigationContext, useLiveRegion } from '../lib/keyboard-navigation'

interface KeyboardNavigationContextType {
  registerShortcut: (key: string, handler: () => void) => void
  unregisterShortcut: (key: string) => void
  announce: (message: string, priority?: 'polite' | 'assertive') => void
}

const KeyboardNavigationContext = createContext<KeyboardNavigationContextType | null>(null)

interface KeyboardNavigationProviderProps {
  children: ReactNode
}

export const KeyboardNavigationProvider: React.FC<KeyboardNavigationProviderProps> = ({ 
  children 
}) => {
  const { registerShortcut, unregisterShortcut } = useKeyboardNavigationContext()
  const { announce } = useLiveRegion()

  const contextValue: KeyboardNavigationContextType = {
    registerShortcut,
    unregisterShortcut,
    announce,
  }

  return (
    <KeyboardNavigationContext.Provider value={contextValue}>
      {children}
    </KeyboardNavigationContext.Provider>
  )
}

export const useKeyboardNavigation = (): KeyboardNavigationContextType => {
  const context = useContext(KeyboardNavigationContext)
  if (!context) {
    throw new Error('useKeyboardNavigation must be used within a KeyboardNavigationProvider')
  }
  return context
}

// Keyboard navigation hook for components that need global shortcuts
export const useGlobalKeyboardShortcut = (
  key: string,
  handler: () => void,
  dependencies: React.DependencyList = []
) => {
  const { registerShortcut, unregisterShortcut } = useKeyboardNavigation()

  React.useEffect(() => {
    registerShortcut(key, handler)
    return () => unregisterShortcut(key)
  }, [key, handler, registerShortcut, unregisterShortcut, ...dependencies])
}

// Keyboard navigation hook for screen reader announcements
export const useScreenReaderAnnouncement = () => {
  const { announce } = useKeyboardNavigation()
  return announce
} 