/**
 * PriorityBadge Storybook Stories
 *
 * Story wish-2003: Detail & Edit Pages
 */

import type { Meta, StoryObj } from '@storybook/react'
import { PriorityBadge } from '@repo/app-wishlist-gallery/components/PriorityBadge'

const meta: Meta<typeof PriorityBadge> = {
  title: 'Wishlist/PriorityBadge',
  component: PriorityBadge,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    priority: {
      control: { type: 'range', min: 0, max: 5, step: 1 },
      description: 'Priority level (0=None, 5=Must Have)',
    },
    showLabel: {
      control: 'boolean',
      description: 'Show text label alongside stars',
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: 'Size variant',
    },
  },
}

export default meta
type Story = StoryObj<typeof meta>

// None priority (renders nothing without label)
export const None: Story = {
  args: {
    priority: 0,
    showLabel: true,
    size: 'md',
  },
  parameters: {
    docs: {
      description: {
        story: 'Priority 0 (None) only renders when showLabel is true.',
      },
    },
  },
}

// Low priority (1 star)
export const Low: Story = {
  args: {
    priority: 1,
    showLabel: true,
    size: 'md',
  },
}

// Medium priority (2 stars)
export const Medium: Story = {
  args: {
    priority: 2,
    showLabel: true,
    size: 'md',
  },
}

// High priority (3 stars)
export const High: Story = {
  args: {
    priority: 3,
    showLabel: true,
    size: 'md',
  },
}

// Very High priority (4 stars)
export const VeryHigh: Story = {
  args: {
    priority: 4,
    showLabel: true,
    size: 'md',
  },
}

// Must Have priority (5 stars)
export const MustHave: Story = {
  args: {
    priority: 5,
    showLabel: true,
    size: 'md',
  },
  parameters: {
    docs: {
      description: {
        story: 'Maximum priority with red styling to indicate urgency.',
      },
    },
  },
}

// Stars only (no label)
export const StarsOnly: Story = {
  args: {
    priority: 3,
    showLabel: false,
    size: 'md',
  },
  parameters: {
    docs: {
      description: {
        story: 'Shows only stars without the text label.',
      },
    },
  },
}

// Small size
export const Small: Story = {
  args: {
    priority: 4,
    showLabel: true,
    size: 'sm',
  },
}

// Large size
export const Large: Story = {
  args: {
    priority: 4,
    showLabel: true,
    size: 'lg',
  },
}

// All sizes comparison
export const AllSizes: Story = {
  args: {
    priority: 4,
    showLabel: true,
    size: 'md',
  },
  render: () => (
    <div className="flex items-center gap-8">
      <div className="text-center">
        <p className="text-sm text-muted-foreground mb-2">Small</p>
        <PriorityBadge priority={4} showLabel={true} size="sm" />
      </div>
      <div className="text-center">
        <p className="text-sm text-muted-foreground mb-2">Medium</p>
        <PriorityBadge priority={4} showLabel={true} size="md" />
      </div>
      <div className="text-center">
        <p className="text-sm text-muted-foreground mb-2">Large</p>
        <PriorityBadge priority={4} showLabel={true} size="lg" />
      </div>
    </div>
  ),
}

// All priority levels
export const AllPriorities: Story = {
  args: {
    priority: 0,
    showLabel: true,
    size: 'md',
  },
  render: () => (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <span className="w-20 text-sm text-muted-foreground">0 - None:</span>
        <PriorityBadge priority={0} showLabel={true} size="md" />
      </div>
      <div className="flex items-center gap-4">
        <span className="w-20 text-sm text-muted-foreground">1 - Low:</span>
        <PriorityBadge priority={1} showLabel={true} size="md" />
      </div>
      <div className="flex items-center gap-4">
        <span className="w-20 text-sm text-muted-foreground">2 - Med:</span>
        <PriorityBadge priority={2} showLabel={true} size="md" />
      </div>
      <div className="flex items-center gap-4">
        <span className="w-20 text-sm text-muted-foreground">3 - High:</span>
        <PriorityBadge priority={3} showLabel={true} size="md" />
      </div>
      <div className="flex items-center gap-4">
        <span className="w-20 text-sm text-muted-foreground">4 - V.High:</span>
        <PriorityBadge priority={4} showLabel={true} size="md" />
      </div>
      <div className="flex items-center gap-4">
        <span className="w-20 text-sm text-muted-foreground">5 - Must:</span>
        <PriorityBadge priority={5} showLabel={true} size="md" />
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'All priority levels from 0 (None) to 5 (Must Have).',
      },
    },
  },
}

// Stars only comparison
export const StarsOnlyComparison: Story = {
  args: {
    priority: 1,
    showLabel: false,
    size: 'md',
  },
  render: () => (
    <div className="flex flex-col gap-4">
      {[1, 2, 3, 4, 5].map(priority => (
        <div key={priority} className="flex items-center gap-4">
          <span className="w-8 text-sm text-muted-foreground">{priority}:</span>
          <PriorityBadge priority={priority} showLabel={false} size="md" />
        </div>
      ))}
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Stars-only display for compact layouts.',
      },
    },
  },
}
