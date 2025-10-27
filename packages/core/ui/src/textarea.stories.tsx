import type { Meta, StoryObj } from '@storybook/react'
import { Textarea } from './textarea'
import { Label } from './label'

const meta: Meta<typeof Textarea> = {
  title: 'UI/Textarea',
  component: Textarea,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'A textarea component for multi-line text input.',
      },
    },
  },
  argTypes: {
    placeholder: {
      control: { type: 'text' },
      description: 'Placeholder text for the textarea',
    },
    disabled: {
      control: { type: 'boolean' },
      description: 'Whether the textarea is disabled',
    },
    required: {
      control: { type: 'boolean' },
      description: 'Whether the textarea is required',
    },
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    placeholder: 'Enter your message here...',
  },
}

export const WithLabel: Story = {
  render: () => (
    <div className="grid w-full max-w-sm items-center gap-1.5">
      <Label htmlFor="message">Message</Label>
      <Textarea id="message" placeholder="Type your message here." />
    </div>
  ),
}

export const WithValue: Story = {
  args: {
    value: 'This is a pre-filled textarea with some content.',
  },
}

export const Disabled: Story = {
  args: {
    disabled: true,
    placeholder: 'This textarea is disabled',
  },
}

export const Required: Story = {
  render: () => (
    <div className="grid w-full max-w-sm items-center gap-1.5">
      <Label htmlFor="required-message">Required Message *</Label>
      <Textarea id="required-message" placeholder="This field is required" required />
    </div>
  ),
}

export const Large: Story = {
  args: {
    placeholder: 'Enter a longer message...',
    className: 'min-h-[200px]',
  },
}

export const Small: Story = {
  args: {
    placeholder: 'Short message...',
    className: 'min-h-[80px]',
  },
}

export const WithCharacterCount: Story = {
  render: () => (
    <div className="grid w-full max-w-sm items-center gap-1.5">
      <Label htmlFor="bio">Bio</Label>
      <Textarea
        id="bio"
        placeholder="Tell us about yourself..."
        maxLength={280}
        className="min-h-[100px]"
      />
      <div className="text-xs text-muted-foreground text-right">0/280 characters</div>
    </div>
  ),
}

export const FormExample: Story = {
  render: () => (
    <div className="space-y-4 w-[400px]">
      <div className="grid items-center gap-1.5">
        <Label htmlFor="name">Name</Label>
        <input
          id="name"
          placeholder="Enter your name"
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        />
      </div>

      <div className="grid items-center gap-1.5">
        <Label htmlFor="email">Email</Label>
        <input
          id="email"
          type="email"
          placeholder="Enter your email"
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        />
      </div>

      <div className="grid items-center gap-1.5">
        <Label htmlFor="message">Message</Label>
        <Textarea id="message" placeholder="Enter your message..." className="min-h-[120px]" />
      </div>

      <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
        Send Message
      </button>
    </div>
  ),
}

export const DifferentSizes: Story = {
  render: () => (
    <div className="space-y-4 w-[400px]">
      <div className="grid items-center gap-1.5">
        <Label htmlFor="small">Small Textarea</Label>
        <Textarea id="small" placeholder="Small textarea..." className="min-h-[60px] text-sm" />
      </div>

      <div className="grid items-center gap-1.5">
        <Label htmlFor="default">Default Textarea</Label>
        <Textarea id="default" placeholder="Default textarea..." className="min-h-[100px]" />
      </div>

      <div className="grid items-center gap-1.5">
        <Label htmlFor="large">Large Textarea</Label>
        <Textarea id="large" placeholder="Large textarea..." className="min-h-[200px] text-lg" />
      </div>
    </div>
  ),
}

export const WithError: Story = {
  render: () => (
    <div className="grid w-full max-w-sm items-center gap-1.5">
      <Label htmlFor="error-message">Message</Label>
      <Textarea
        id="error-message"
        placeholder="Enter your message..."
        className="border-red-500 focus:border-red-500"
      />
      <p className="text-sm text-red-600">This field is required.</p>
    </div>
  ),
}
