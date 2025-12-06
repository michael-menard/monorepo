import { ThemeProvider } from '@repo/app-component-library'
import { UserSettingsModule } from './Module'

export function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="user-settings-theme">
      <UserSettingsModule />
    </ThemeProvider>
  )
}
