import { ThemeProvider } from '@repo/app-component-library'
import { AppDashboardModule } from './Module'

export function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="app-dashboard-theme">
      <AppDashboardModule />
    </ThemeProvider>
  )
}
