import type { Meta, StoryObj } from '@storybook/react'
import { Input } from './input'
import { Label } from './label'

const meta: Meta<typeof Input> = {
  title: 'UI/Input',
  component: Input,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'A flexible input component with various states and configurations.',
      },
    },
  },
  argTypes: {
    type: {
      control: { type: 'select' },
      options: ['text', 'email', 'password', 'number', 'tel', 'url', 'search'],
      description: 'The type of input',
    },
    placeholder: {
      control: { type: 'text' },
      description: 'Placeholder text for the input',
    },
    disabled: {
      control: { type: 'boolean' },
      description: 'Whether the input is disabled',
    },
    required: {
      control: { type: 'boolean' },
      description: 'Whether the input is required',
    },
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    placeholder: 'Enter text...',
  },
}

export const WithLabel: Story = {
  render: (args) => (
    <div className="grid w-full max-w-sm items-center gap-1.5">
      <Label htmlFor="email">Email</Label>
      <Input {...args} id="email" type="email" />
    </div>
  ),
  args: {
    placeholder: 'Enter your email...',
  },
}

export const Password: Story = {
  args: {
    type: 'password',
    placeholder: 'Enter password...',
  },
}

export const Number: Story = {
  args: {
    type: 'number',
    placeholder: 'Enter number...',
  },
}

export const Search: Story = {
  args: {
    type: 'search',
    placeholder: 'Search...',
  },
}

export const Disabled: Story = {
  args: {
    disabled: true,
    placeholder: 'Disabled input',
  },
}

export const Required: Story = {
  render: (args) => (
    <div className="grid w-full max-w-sm items-center gap-1.5">
      <Label htmlFor="required">Required Field *</Label>
      <Input {...args} id="required" required />
    </div>
  ),
  args: {
    placeholder: 'This field is required',
  },
}

export const WithValue: Story = {
  args: {
    value: 'Pre-filled value',
  },
}

export const AllTypes: Story = {
  render: () => (
    <div className="grid w-full max-w-md gap-4">
      <div className="grid items-center gap-1.5">
        <Label htmlFor="text">Text</Label>
        <Input id="text" type="text" placeholder="Text input" />
      </div>
      <div className="grid items-center gap-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" placeholder="Email input" />
      </div>
      <div className="grid items-center gap-1.5">
        <Label htmlFor="password">Password</Label>
        <Input id="password" type="password" placeholder="Password input" />
      </div>
      <div className="grid items-center gap-1.5">
        <Label htmlFor="number">Number</Label>
        <Input id="number" type="number" placeholder="Number input" />
      </div>
      <div className="grid items-center gap-1.5">
        <Label htmlFor="tel">Telephone</Label>
        <Input id="tel" type="tel" placeholder="Telephone input" />
      </div>
      <div className="grid items-center gap-1.5">
        <Label htmlFor="url">URL</Label>
        <Input id="url" type="url" placeholder="URL input" />
      </div>
      <div className="grid items-center gap-1.5">
        <Label htmlFor="search">Search</Label>
        <Input id="search" type="search" placeholder="Search input" />
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'All input types displayed together for comparison.',
      },
    },
  },
} 