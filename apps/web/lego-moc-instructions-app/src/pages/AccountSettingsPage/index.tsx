import React from 'react'
import { Settings, User, Palette, Bell, Shield, Database, Smartphone } from 'lucide-react'
import { SettingsCard, FormSection, ThemeSelector, PWASettings } from '../../components/settings'
import { useUserPreferencesContext } from '../../providers/UserPreferencesProvider'

export const AccountSettingsPage: React.FC = () => {
  const { preferences, isLoading, updatePreference } = useUserPreferencesContext()

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading preferences...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center space-x-3 mb-2">
          <Settings className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold text-foreground">Account Settings</h1>
        </div>
        <p className="text-muted-foreground">
          Manage your account preferences and customize your experience.
        </p>
      </div>

      {/* Settings Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Profile Settings */}
        <SettingsCard
          title="Profile"
          description="Update your personal information and profile details"
          icon={User}
          iconColor="text-blue-600"
        >
          <p className="text-sm text-muted-foreground">
            Coming soon - manage your profile information, avatar, and display name.
          </p>
        </SettingsCard>

        {/* Appearance Settings */}
        <SettingsCard
          title="Appearance"
          description="Customize the look and feel of your interface"
          icon={Palette}
          iconColor="text-purple-600"
        >
          <FormSection
            title="Theme"
            description="Choose your preferred color scheme"
          >
            <ThemeSelector />
          </FormSection>
        </SettingsCard>

        {/* PWA Settings */}
        <SettingsCard
          title="App Installation"
          description="Install and manage the progressive web app"
          icon={Smartphone}
          iconColor="text-indigo-600"
          className="md:col-span-2"
        >
          <PWASettings />
        </SettingsCard>

        {/* Notifications Settings */}
        <SettingsCard
          title="Notifications"
          description="Control how and when you receive notifications"
          icon={Bell}
          iconColor="text-green-600"
        >
          <p className="text-sm text-muted-foreground">
            Coming soon - manage email notifications, push notifications, and alerts.
          </p>
        </SettingsCard>

        {/* Privacy & Security */}
        <SettingsCard
          title="Privacy & Security"
          description="Manage your privacy settings and account security"
          icon={Shield}
          iconColor="text-red-600"
        >
          <p className="text-sm text-muted-foreground">
            Coming soon - password management, two-factor authentication, and privacy controls.
          </p>
        </SettingsCard>

        {/* Data Management */}
        <SettingsCard
          title="Data Management"
          description="Export, import, or delete your account data"
          icon={Database}
          iconColor="text-orange-600"
          className="md:col-span-2"
        >
          <p className="text-sm text-muted-foreground">
            Coming soon - data export, account deletion, and data portability options.
          </p>
        </SettingsCard>
      </div>
    </div>
  )
}

export default AccountSettingsPage
