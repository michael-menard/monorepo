import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ThemeProvider } from '@repo/app-component-library'
import { DashboardModule } from './Module'
import { SettingsModule } from './SettingsModule'

/**
 * Standalone dev shell for app-dashboard.
 * Provides its own BrowserRouter so the module works
 * outside the main-app shell (pnpm dev in this workspace).
 */
export function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="app-dashboard-theme">
      <BrowserRouter>
        <Routes>
          <Route path="/dashboard" element={<DashboardModule />} />
          <Route path="/settings/*" element={<SettingsModule />} />
          <Route path="*" element={<DashboardModule />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  )
}
