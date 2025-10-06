import React, { createContext, useContext, useEffect } from 'react'
import { useTheme } from '@repo/ui'
import { useUserPreferences, type UserPreferences } from '../hooks'

interface UserPreferencesContextType {
  preferences: UserPreferences
  isLoading: boolean
  error: string | null
  updatePreference: <K extends keyof UserPreferences>(
    key: K,
    value: UserPreferences[K]
  ) => boolean
  updateNestedPreference: <
    K extends keyof UserPreferences,
    NK extends keyof UserPreferences[K]
  >(
    key: K,
    nestedKey: NK,
    value: UserPreferences[K][NK]
  ) => boolean
  savePreferences: (newPreferences: UserPreferences) => boolean
  resetPreferences: () => boolean
  exportPreferences: () => string
  importPreferences: (preferencesJson: string) => boolean
}

const UserPreferencesContext = createContext<UserPreferencesContextType | null>(null)

interface UserPreferencesProviderProps {
  children: React.ReactNode
}

export const UserPreferencesProvider: React.FC<UserPreferencesProviderProps> = ({
  children
}) => {
  const preferencesHook = useUserPreferences()
  const { setTheme } = useTheme()

  // Sync theme preference with ThemeProvider
  useEffect(() => {
    if (!preferencesHook.isLoading && preferencesHook.preferences.theme) {
      setTheme(preferencesHook.preferences.theme)
    }
  }, [preferencesHook.preferences.theme, preferencesHook.isLoading, setTheme])

  // Apply accessibility preferences
  useEffect(() => {
    if (!preferencesHook.isLoading) {
      const { accessibility } = preferencesHook.preferences
      
      // Apply reduced motion preference
      if (accessibility.reducedMotion) {
        document.documentElement.style.setProperty('--motion-reduce', '1')
      } else {
        document.documentElement.style.removeProperty('--motion-reduce')
      }

      // Apply high contrast preference
      if (accessibility.highContrast) {
        document.documentElement.classList.add('high-contrast')
      } else {
        document.documentElement.classList.remove('high-contrast')
      }

      // Apply font size preference
      document.documentElement.setAttribute('data-font-size', accessibility.fontSize)
    }
  }, [preferencesHook.preferences.accessibility, preferencesHook.isLoading])

  const value: UserPreferencesContextType = {
    preferences: preferencesHook.preferences,
    isLoading: preferencesHook.isLoading,
    error: preferencesHook.error,
    updatePreference: preferencesHook.updatePreference,
    updateNestedPreference: preferencesHook.updateNestedPreference,
    savePreferences: preferencesHook.savePreferences,
    resetPreferences: preferencesHook.resetPreferences,
    exportPreferences: preferencesHook.exportPreferences,
    importPreferences: preferencesHook.importPreferences,
  }

  return (
    <UserPreferencesContext.Provider value={value}>
      {children}
    </UserPreferencesContext.Provider>
  )
}

export const useUserPreferencesContext = (): UserPreferencesContextType => {
  const context = useContext(UserPreferencesContext)
  if (!context) {
    throw new Error('useUserPreferencesContext must be used within a UserPreferencesProvider')
  }
  return context
}

export default UserPreferencesProvider
