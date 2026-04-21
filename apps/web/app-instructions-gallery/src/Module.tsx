/**
 * Instructions Gallery Module
 *
 * Main entry point for the Instructions Gallery feature module.
 * This module is designed to be lazy-loaded by the shell app.
 * Uses React Router v7 for internal routing.
 */
import { Routes, Route } from 'react-router-dom'
import { ModuleLayout } from './components/module-layout'
import { MainPage } from './pages/main-page'
import { CreateMocPage } from './pages/CreateMocPage'
import { MocDetailModule } from './pages/MocDetailModule'

/**
 * Instructions Module Component
 *
 * This is the main export that the shell app will lazy-load.
 * Routing is handled internally via React Router relative paths.
 */
export function InstructionsModule() {
  return (
    <ModuleLayout>
      <Routes>
        <Route index element={<MainPage />} />
        <Route path="new" element={<CreateMocPage />} />
        <Route path=":idOrSlug" element={<MocDetailModule />} />
      </Routes>
    </ModuleLayout>
  )
}

/**
 * Backward-compatible alias (preserves original typo)
 */
export const InstuctionsGalleryModule = InstructionsModule

// Default export for lazy loading
export default InstructionsModule
