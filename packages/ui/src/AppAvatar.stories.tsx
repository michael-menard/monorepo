import type { Meta, StoryObj } from '@storybook/react'
import { AppAvatar } from './AppAvatar'

const meta: Meta<typeof AppAvatar> = {
  title: 'UI/AppAvatar',
  component: AppAvatar,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'A specialized avatar component for displaying user profiles with various states and configurations.',
      },
    },
  },
  argTypes: {
    size: {
      control: { type: 'select' },
      options: ['sm', 'md', 'lg', 'xl'],
      description: 'The size of the avatar',
    },
    status: {
      control: { type: 'select' },
      options: ['online', 'offline', 'away', 'busy'],
      description: 'The status indicator',
    },
    showStatus: {
      control: { type: 'boolean' },
      description: 'Whether to show the status indicator',
    },
    editable: {
      control: { type: 'boolean' },
      description: 'Whether the avatar is editable',
    },
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    name: 'John Doe',
    email: 'john.doe@example.com',
  },
}

export const WithImage: Story = {
  args: {
    name: 'Jane Smith',
    email: 'jane.smith@example.com',
    imageUrl: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face',
  },
}

export const Small: Story = {
  args: {
    name: 'Alice Johnson',
    email: 'alice.johnson@example.com',
    size: 'sm',
  },
}

export const Large: Story = {
  args: {
    name: 'Bob Wilson',
    email: 'bob.wilson@example.com',
    size: 'lg',
  },
}

export const ExtraLarge: Story = {
  args: {
    name: 'Carol Brown',
    email: 'carol.brown@example.com',
    size: 'xl',
  },
}

export const Online: Story = {
  args: {
    name: 'David Lee',
    email: 'david.lee@example.com',
    status: 'online',
    showStatus: true,
  },
}

export const Offline: Story = {
  args: {
    name: 'Eva Garcia',
    email: 'eva.garcia@example.com',
    status: 'offline',
    showStatus: true,
  },
}

export const Away: Story = {
  args: {
    name: 'Frank Miller',
    email: 'frank.miller@example.com',
    status: 'away',
    showStatus: true,
  },
}

export const Busy: Story = {
  args: {
    name: 'Grace Taylor',
    email: 'grace.taylor@example.com',
    status: 'busy',
    showStatus: true,
  },
}

export const Editable: Story = {
  args: {
    name: 'Henry Adams',
    email: 'henry.adams@example.com',
    editable: true,
  },
}

export const WithLongName: Story = {
  args: {
    name: 'Isabella Rodriguez Martinez',
    email: 'isabella.rodriguez.martinez@example.com',
  },
}

export const NoEmail: Story = {
  args: {
    name: 'Jack Thompson',
  },
}

export const AllSizes: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <AppAvatar name="Small" size="sm" />
      <AppAvatar name="Medium" size="md" />
      <AppAvatar name="Large" size="lg" />
      <AppAvatar name="Extra Large" size="xl" />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'All avatar sizes displayed together for comparison.',
      },
    },
  },
}

export const AllStatuses: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <AppAvatar name="Online" status="online" showStatus />
      <AppAvatar name="Offline" status="offline" showStatus />
      <AppAvatar name="Away" status="away" showStatus />
      <AppAvatar name="Busy" status="busy" showStatus />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'All status indicators displayed together for comparison.',
      },
    },
  },
}

export const WithFallback: Story = {
  args: {
    name: 'Kate Wilson',
    email: 'kate.wilson@example.com',
    imageUrl: 'https://invalid-url-that-will-fail.com/image.jpg',
  },
  parameters: {
    docs: {
      description: {
        story: 'Avatar with an invalid image URL that will fall back to initials.',
      },
    },
  },
} 