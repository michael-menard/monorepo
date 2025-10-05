import type { Meta, StoryObj } from '@storybook/react'
import { Switch } from './switch'
import { Label } from './label'

const meta: Meta<typeof Switch> = {
  title: 'UI/Switch',
  component: Switch,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'A toggle switch component for boolean input.',
      },
    },
  },
  argTypes: {
    checked: {
      control: { type: 'boolean' },
      description: 'Whether the switch is checked',
    },
    disabled: {
      control: { type: 'boolean' },
      description: 'Whether the switch is disabled',
    },
    required: {
      control: { type: 'boolean' },
      description: 'Whether the switch is required',
    },
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <div className="flex items-center space-x-2">
      <Switch id="airplane-mode" />
      <Label htmlFor="airplane-mode">Airplane mode</Label>
    </div>
  ),
}

export const Checked: Story = {
  render: () => (
    <div className="flex items-center space-x-2">
      <Switch id="notifications" defaultChecked />
      <Label htmlFor="notifications">Notifications</Label>
    </div>
  ),
}

export const Disabled: Story = {
  render: () => (
    <div className="flex items-center space-x-2">
      <Switch id="disabled-switch" disabled />
      <Label htmlFor="disabled-switch">Disabled switch</Label>
    </div>
  ),
}

export const DisabledChecked: Story = {
  render: () => (
    <div className="flex items-center space-x-2">
      <Switch id="disabled-checked" defaultChecked disabled />
      <Label htmlFor="disabled-checked">Disabled checked switch</Label>
    </div>
  ),
}

export const MultipleSwitches: Story = {
  render: () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label htmlFor="email-notifications">Email notifications</Label>
        <Switch id="email-notifications" defaultChecked />
      </div>
      <div className="flex items-center justify-between">
        <Label htmlFor="push-notifications">Push notifications</Label>
        <Switch id="push-notifications" />
      </div>
      <div className="flex items-center justify-between">
        <Label htmlFor="sms-notifications">SMS notifications</Label>
        <Switch id="sms-notifications" />
      </div>
      <div className="flex items-center justify-between">
        <Label htmlFor="marketing-emails">Marketing emails</Label>
        <Switch id="marketing-emails" defaultChecked />
      </div>
    </div>
  ),
}

export const WithDescription: Story = {
  render: () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label htmlFor="auto-save">Auto-save</Label>
          <p className="text-sm text-muted-foreground">
            Automatically save your changes as you work.
          </p>
        </div>
        <Switch id="auto-save" defaultChecked />
      </div>
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label htmlFor="dark-mode">Dark mode</Label>
          <p className="text-sm text-muted-foreground">
            Switch between light and dark themes.
          </p>
        </div>
        <Switch id="dark-mode" />
      </div>
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label htmlFor="two-factor">Two-factor authentication</Label>
          <p className="text-sm text-muted-foreground">
            Add an extra layer of security to your account.
          </p>
        </div>
        <Switch id="two-factor" />
      </div>
    </div>
  ),
}

export const SettingsPanel: Story = {
  render: () => (
    <div className="w-[400px] space-y-6">
      <div>
        <h3 className="text-lg font-medium">Account Settings</h3>
        <p className="text-sm text-muted-foreground">
          Manage your account preferences and security settings.
        </p>
      </div>
      
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="public-profile">Public profile</Label>
            <p className="text-sm text-muted-foreground">
              Allow others to see your profile information.
            </p>
          </div>
          <Switch id="public-profile" defaultChecked />
        </div>
        
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="email-verified">Email verified</Label>
            <p className="text-sm text-muted-foreground">
              Your email address has been verified.
            </p>
          </div>
          <Switch id="email-verified" defaultChecked disabled />
        </div>
        
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="login-alerts">Login alerts</Label>
            <p className="text-sm text-muted-foreground">
              Get notified when someone logs into your account.
            </p>
          </div>
          <Switch id="login-alerts" />
        </div>
        
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="data-sharing">Data sharing</Label>
            <p className="text-sm text-muted-foreground">
              Allow us to use your data to improve our services.
            </p>
          </div>
          <Switch id="data-sharing" />
        </div>
      </div>
    </div>
  ),
} 