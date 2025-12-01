import type { Meta, StoryObj } from '@storybook/react'
import { AppAvatar } from '../avatars/AppAvatar'

const meta: Meta<typeof AppAvatar> = {
  title: 'UI/AppAvatar',
  component: AppAvatar,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'A specialized avatar component for displaying user profiles with various states and configurations.',
      },
    },
  },
  argTypes: {
    size: {
      control: { type: 'select' },
      options: ['sm', 'md', 'lg'],
      description: 'The size of the avatar',
    },
    // Removed problematic argTypes that don't exist in the component interface
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    userName: 'John Doe',
  },
}

export const WithImage: Story = {
  args: {
    userName: 'Jane Smith',
    avatarUrl:
      'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face',
  },
}

export const Small: Story = {
  args: {
    userName: 'Alice Johnson',
    size: 'sm',
  },
}

export const Large: Story = {
  args: {
    userName: 'Bob Wilson',
    size: 'lg',
  },
}

export const Disabled: Story = {
  args: {
    userName: 'Carol Brown',
    disabled: true,
  },
}

export const WithEditButton: Story = {
  args: {
    userName: 'David Lee',
    showEditButton: true,
  },
}

export const NonClickable: Story = {
  args: {
    userName: 'Eva Garcia',
    clickable: false,
  },
}

export const CustomClass: Story = {
  args: {
    userName: 'Frank Miller',
    className: 'border-2 border-blue-500',
  },
}

export const Editable: Story = {
  args: {
    userName: 'Henry Adams',
    showEditButton: true,
  },
}

export const WithLongName: Story = {
  args: {
    userName: 'Isabella Rodriguez Martinez',
  },
}

export const NoEmail: Story = {
  args: {
    userName: 'Jack Thompson',
  },
}

export const AllSizes: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <AppAvatar
        userName="Small"
        size="sm"
        disabled={false}
        showEditButton={false}
        clickable={true}
      />
      <AppAvatar
        userName="Medium"
        size="md"
        disabled={false}
        showEditButton={false}
        clickable={true}
      />
      <AppAvatar
        userName="Large"
        size="lg"
        disabled={false}
        showEditButton={false}
        clickable={true}
      />
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
      <AppAvatar
        userName="Online"
        size="md"
        disabled={false}
        showEditButton={false}
        clickable={true}
      />
      <AppAvatar
        userName="Offline"
        size="md"
        disabled={false}
        showEditButton={false}
        clickable={true}
      />
      <AppAvatar
        userName="Away"
        size="md"
        disabled={false}
        showEditButton={false}
        clickable={true}
      />
      <AppAvatar
        userName="Busy"
        size="md"
        disabled={false}
        showEditButton={false}
        clickable={true}
      />
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
    userName: 'Kate Wilson',
    avatarUrl: 'https://invalid-url-that-will-fail.com/image.jpg',
  },
  parameters: {
    docs: {
      description: {
        story: 'Avatar with an invalid image URL that will fall back to initials.',
      },
    },
  },
}
