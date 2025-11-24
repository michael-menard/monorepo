import type { Meta, StoryObj } from '@storybook/react'
import { Button } from '../ui/button'

const meta: Meta<typeof Button> = {
  title: 'LEGO MOC/Button Variants',
  component: Button,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: [
        'default',
        'destructive',
        'outline',
        'secondary',
        'ghost',
        'link',
        'lego-primary',
        'lego-secondary',
        'lego-accent',
        'lego-success',
        'lego-warning',
        'lego-outline',
        'lego-ghost',
      ],
    },
    size: {
      control: { type: 'select' },
      options: ['default', 'sm', 'lg', 'icon'],
    },
  },
}

export default meta
type Story = StoryObj<typeof meta>

export const LegoPrimary: Story = {
  args: {
    variant: 'lego-primary',
    children: 'Add to Wishlist',
  },
}

export const LegoSecondary: Story = {
  args: {
    variant: 'lego-secondary',
    children: 'View Details',
  },
}

export const LegoAccent: Story = {
  args: {
    variant: 'lego-accent',
    children: 'Share MOC',
  },
}

export const LegoSuccess: Story = {
  args: {
    variant: 'lego-success',
    children: 'Download Complete',
  },
}

export const LegoWarning: Story = {
  args: {
    variant: 'lego-warning',
    children: 'Missing Parts',
  },
}

export const LegoOutline: Story = {
  args: {
    variant: 'lego-outline',
    children: 'Browse Gallery',
  },
}

export const LegoGhost: Story = {
  args: {
    variant: 'lego-ghost',
    children: 'Quick Action',
  },
}

export const AllVariants: Story = {
  render: () => (
    <div className="grid grid-cols-2 gap-4 max-w-2xl">
      <div className="space-y-3">
        <h3 className="font-semibold text-lg">Standard Variants</h3>
        <div className="space-y-2">
          <Button variant="default">Default</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Destructive</Button>
        </div>
      </div>
      
      <div className="space-y-3">
        <h3 className="font-semibold text-lg">LEGO MOC Variants</h3>
        <div className="space-y-2">
          <Button variant="lego-primary">LEGO Primary</Button>
          <Button variant="lego-secondary">LEGO Secondary</Button>
          <Button variant="lego-accent">LEGO Accent</Button>
          <Button variant="lego-success">LEGO Success</Button>
          <Button variant="lego-warning">LEGO Warning</Button>
          <Button variant="lego-outline">LEGO Outline</Button>
          <Button variant="lego-ghost">LEGO Ghost</Button>
        </div>
      </div>
    </div>
  ),
}

export const ActionButtons: Story = {
  render: () => (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold mb-3">Primary Actions</h3>
        <div className="flex gap-3">
          <Button variant="lego-primary">Add to Wishlist</Button>
          <Button variant="lego-primary">Download Instructions</Button>
          <Button variant="lego-primary">Get Parts List</Button>
        </div>
      </div>
      
      <div>
        <h3 className="font-semibold mb-3">Secondary Actions</h3>
        <div className="flex gap-3">
          <Button variant="lego-outline">View Gallery</Button>
          <Button variant="lego-outline">Share MOC</Button>
          <Button variant="lego-outline">Save for Later</Button>
        </div>
      </div>
      
      <div>
        <h3 className="font-semibold mb-3">Quick Actions</h3>
        <div className="flex gap-3">
          <Button variant="lego-ghost" size="sm">♡ Like</Button>
          <Button variant="lego-ghost" size="sm">⋯ More</Button>
          <Button variant="lego-ghost" size="sm">↗ Share</Button>
        </div>
      </div>
      
      <div>
        <h3 className="font-semibold mb-3">Status Actions</h3>
        <div className="flex gap-3">
          <Button variant="lego-success">✓ Downloaded</Button>
          <Button variant="lego-warning">⚠ Missing Parts</Button>
          <Button variant="destructive">✗ Remove</Button>
        </div>
      </div>
    </div>
  ),
}

export const Sizes: Story = {
  render: () => (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="lego-primary" size="sm">Small</Button>
        <Button variant="lego-primary" size="default">Default</Button>
        <Button variant="lego-primary" size="lg">Large</Button>
      </div>
      
      <div className="flex items-center gap-3">
        <Button variant="lego-outline" size="sm">Small Outline</Button>
        <Button variant="lego-outline" size="default">Default Outline</Button>
        <Button variant="lego-outline" size="lg">Large Outline</Button>
      </div>
    </div>
  ),
}
