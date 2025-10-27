import type { Meta, StoryObj } from '@storybook/react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs'

const meta: Meta<typeof Tabs> = {
  title: 'UI/Tabs',
  component: Tabs,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'A tab component for organizing content into multiple views.',
      },
    },
  },
  argTypes: {
    defaultValue: {
      control: { type: 'text' },
      description: 'The default active tab',
    },
    value: {
      control: { type: 'text' },
      description: 'The currently active tab',
    },
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <Tabs defaultValue="account" className="w-[400px]">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="account">Account</TabsTrigger>
        <TabsTrigger value="password">Password</TabsTrigger>
      </TabsList>
      <TabsContent value="account">
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Account</h3>
          <p className="text-sm text-muted-foreground">
            Make changes to your account here. Click save when you're done.
          </p>
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium">
              Name
            </label>
            <input
              id="name"
              placeholder="Enter your name"
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              type="email"
              placeholder="Enter your email"
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
        </div>
      </TabsContent>
      <TabsContent value="password">
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Password</h3>
          <p className="text-sm text-muted-foreground">
            Change your password here. After saving, you'll be logged out.
          </p>
          <div className="space-y-2">
            <label htmlFor="current" className="text-sm font-medium">
              Current password
            </label>
            <input
              id="current"
              type="password"
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="new" className="text-sm font-medium">
              New password
            </label>
            <input
              id="new"
              type="password"
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
        </div>
      </TabsContent>
    </Tabs>
  ),
}

export const ThreeTabs: Story = {
  render: () => (
    <Tabs defaultValue="overview" className="w-[600px]">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="analytics">Analytics</TabsTrigger>
        <TabsTrigger value="reports">Reports</TabsTrigger>
      </TabsList>
      <TabsContent value="overview">
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Overview</h3>
          <p className="text-sm text-muted-foreground">
            Get a quick overview of your dashboard and recent activity.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 border rounded-lg">
              <div className="text-2xl font-bold">1,234</div>
              <div className="text-sm text-muted-foreground">Total Users</div>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="text-2xl font-bold">$45,230</div>
              <div className="text-sm text-muted-foreground">Revenue</div>
            </div>
          </div>
        </div>
      </TabsContent>
      <TabsContent value="analytics">
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Analytics</h3>
          <p className="text-sm text-muted-foreground">
            View detailed analytics and performance metrics.
          </p>
          <div className="h-32 bg-gray-100 rounded-lg flex items-center justify-center">
            <p className="text-muted-foreground">Analytics Chart Placeholder</p>
          </div>
        </div>
      </TabsContent>
      <TabsContent value="reports">
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Reports</h3>
          <p className="text-sm text-muted-foreground">Generate and download detailed reports.</p>
          <div className="space-y-2">
            <button className="w-full px-4 py-2 text-left border rounded-lg hover:bg-gray-50">
              Monthly Report - January 2024
            </button>
            <button className="w-full px-4 py-2 text-left border rounded-lg hover:bg-gray-50">
              Quarterly Report - Q4 2023
            </button>
            <button className="w-full px-4 py-2 text-left border rounded-lg hover:bg-gray-50">
              Annual Report - 2023
            </button>
          </div>
        </div>
      </TabsContent>
    </Tabs>
  ),
}

export const VerticalTabs: Story = {
  render: () => (
    <Tabs defaultValue="general" className="w-[600px] flex gap-6">
      <TabsList className="flex flex-col h-auto w-[200px]">
        <TabsTrigger value="general" className="justify-start">
          General
        </TabsTrigger>
        <TabsTrigger value="security" className="justify-start">
          Security
        </TabsTrigger>
        <TabsTrigger value="notifications" className="justify-start">
          Notifications
        </TabsTrigger>
        <TabsTrigger value="billing" className="justify-start">
          Billing
        </TabsTrigger>
      </TabsList>
      <div className="flex-1">
        <TabsContent value="general" className="mt-0">
          <div className="space-y-4">
            <h3 className="text-lg font-medium">General Settings</h3>
            <p className="text-sm text-muted-foreground">
              Manage your general account settings and preferences.
            </p>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Language</span>
                <select className="px-3 py-1 border rounded">
                  <option>English</option>
                  <option>Spanish</option>
                  <option>French</option>
                </select>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Timezone</span>
                <select className="px-3 py-1 border rounded">
                  <option>UTC-8 (PST)</option>
                  <option>UTC-5 (EST)</option>
                  <option>UTC+0 (GMT)</option>
                </select>
              </div>
            </div>
          </div>
        </TabsContent>
        <TabsContent value="security" className="mt-0">
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Security Settings</h3>
            <p className="text-sm text-muted-foreground">
              Manage your security preferences and authentication methods.
            </p>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Two-Factor Authentication</span>
                <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                  Enable
                </button>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Login Notifications</span>
                <input type="checkbox" className="w-4 h-4" />
              </div>
            </div>
          </div>
        </TabsContent>
        <TabsContent value="notifications" className="mt-0">
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Notification Preferences</h3>
            <p className="text-sm text-muted-foreground">
              Choose how you want to receive notifications.
            </p>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Email Notifications</span>
                <input type="checkbox" className="w-4 h-4" defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Push Notifications</span>
                <input type="checkbox" className="w-4 h-4" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">SMS Notifications</span>
                <input type="checkbox" className="w-4 h-4" />
              </div>
            </div>
          </div>
        </TabsContent>
        <TabsContent value="billing" className="mt-0">
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Billing Information</h3>
            <p className="text-sm text-muted-foreground">
              Manage your billing information and payment methods.
            </p>
            <div className="space-y-4">
              <div className="p-4 border rounded-lg">
                <div className="font-medium">Current Plan: Pro</div>
                <div className="text-sm text-muted-foreground">$29/month</div>
              </div>
              <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                Update Payment Method
              </button>
            </div>
          </div>
        </TabsContent>
      </div>
    </Tabs>
  ),
}

export const DisabledTabs: Story = {
  render: () => (
    <Tabs defaultValue="active" className="w-[400px]">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="active">Active</TabsTrigger>
        <TabsTrigger value="disabled" disabled>
          Disabled
        </TabsTrigger>
        <TabsTrigger value="coming-soon">Coming Soon</TabsTrigger>
      </TabsList>
      <TabsContent value="active">
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Active Tab</h3>
          <p className="text-sm text-muted-foreground">This tab is active and functional.</p>
        </div>
      </TabsContent>
      <TabsContent value="disabled">
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Disabled Tab</h3>
          <p className="text-sm text-muted-foreground">
            This content is not accessible because the tab is disabled.
          </p>
        </div>
      </TabsContent>
      <TabsContent value="coming-soon">
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Coming Soon</h3>
          <p className="text-sm text-muted-foreground">This feature is coming soon!</p>
        </div>
      </TabsContent>
    </Tabs>
  ),
}
