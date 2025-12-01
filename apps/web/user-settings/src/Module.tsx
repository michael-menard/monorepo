/**
 * UserSettings Module
 *
 * Main entry point for the User Settings feature module.
 * This module is designed to be lazy-loaded by the shell app.
 */
import { z } from 'zod'

import { ModuleLayout } from './components/module-layout'
import { MainPage } from './pages/main-page'

/**
 * Module props schema - validated at runtime
 */
const UserSettingsModulePropsSchema = z.object({
  /** Optional className for styling */
  className: z.string().optional(),
})

export type UserSettingsModuleProps = z.infer<typeof UserSettingsModulePropsSchema>

/**
 * UserSettings Module Component
 *
 * This is the main export that the shell app will lazy-load.
 */
export function UserSettingsModule({ className }: UserSettingsModuleProps) {
  return (
    <ModuleLayout className={className}>
      <MainPage />
    </ModuleLayout>
  )
}

// Default export for lazy loading
export default UserSettingsModule
