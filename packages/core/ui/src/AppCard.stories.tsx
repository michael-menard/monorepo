import type {Meta, StoryObj} from '@storybook/react'
import {AppCard} from './AppCard'
import {Button} from './button'
import {Badge} from './badge'

const meta: Meta<typeof AppCard> = {
  title: 'UI/AppCard',
  component: AppCard,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'A flexible card component with optional header, content, and actions.',
      },
    },
  },
  argTypes: {
    title: {
      control: { type: 'text' },
      description: 'The title displayed in the card header',
    },
    description: {
      control: { type: 'text' },
      description: 'The description displayed in the card header',
    },
    showHeader: {
      control: { type: 'boolean' },
      description: 'Whether to show the header section',
    },
    className: {
      control: { type: 'text' },
      description: 'Additional CSS classes for the card',
    },
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    title: 'Card Title',
    description: 'This is a description of the card content.',
    children: <p>This is the main content of the card.</p>,
  },
}

export const WithActions: Story = {
  args: {
    title: 'Project Dashboard',
    description: 'Overview of your current projects',
    actions: (
      <>
        <Button variant="outline" size="sm">
          View All
        </Button>
        <Button size="sm">New Project</Button>
      </>
    ),
    children: (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span>Active Projects</span>
          <Badge variant="secondary">3</Badge>
        </div>
        <div className="flex items-center justify-between">
          <span>Completed Projects</span>
          <Badge variant="outline">12</Badge>
        </div>
        <div className="flex items-center justify-between">
          <span>Total Revenue</span>
          <span className="font-semibold">$45,230</span>
        </div>
      </div>
    ),
  },
}

export const ContentOnly: Story = {
  args: {
    showHeader: false,
    children: (
      <div className="text-center py-8">
        <h3 className="text-lg font-semibold mb-2">Welcome!</h3>
        <p className="text-muted-foreground">This card has no header, just content.</p>
      </div>
    ),
  },
}

export const WithBadge: Story = {
  args: {
    title: 'User Profile',
    description: 'Manage your account settings',
    actions: <Badge variant="default">Active</Badge>,
    children: (
      <div className="space-y-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
          <div>
            <p className="font-medium">John Doe</p>
            <p className="text-sm text-muted-foreground">john.doe@example.com</p>
          </div>
        </div>
        <div className="pt-3 border-t">
          <Button variant="outline" className="w-full">
            Edit Profile
          </Button>
        </div>
      </div>
    ),
  },
}

export const CustomStyling: Story = {
  args: {
    title: 'Custom Styled Card',
    description: 'This card has custom styling applied',
    className: 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200',
    headerClassName: 'bg-blue-100/50',
    contentClassName: 'bg-white/50',
    children: (
      <div className="space-y-2">
        <p>This card uses custom CSS classes for styling.</p>
        <p className="text-sm text-blue-600">
          The header and content areas have different background colors.
        </p>
      </div>
    ),
  },
}

export const MultipleCards: Story = {
  render: () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <AppCard
        title="Analytics"
        description="View your analytics data"
        actions={<Button size="sm">View</Button>}
      >
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">+12.5%</div>
          <p className="text-sm text-muted-foreground">Growth this month</p>
        </div>
      </AppCard>

      <AppCard
        title="Users"
        description="Manage user accounts"
        actions={<Button size="sm">Add User</Button>}
      >
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">1,234</div>
          <p className="text-sm text-muted-foreground">Total users</p>
        </div>
      </AppCard>

      <AppCard
        title="Settings"
        description="Configure your preferences"
        actions={<Button size="sm">Configure</Button>}
      >
        <div className="text-center">
          <div className="text-2xl font-bold text-purple-600">85%</div>
          <p className="text-sm text-muted-foreground">System health</p>
        </div>
      </AppCard>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Multiple AppCard components in a responsive grid layout.',
      },
    },
  },
}
