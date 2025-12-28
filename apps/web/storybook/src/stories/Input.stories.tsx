import type { Meta, StoryObj } from '@storybook/react'
import { Input, Label } from '@repo/ui'

const meta = {
  title: 'Components/Input',
  component: Input,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    type: {
      control: 'select',
      options: ['text', 'email', 'password', 'number', 'search', 'tel', 'url'],
    },
    disabled: {
      control: 'boolean',
    },
    placeholder: {
      control: 'text',
    },
  },
} satisfies Meta<typeof Input>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    placeholder: 'Enter text...',
  },
}

export const WithLabel: Story = {
  render: () => (
    <div className="grid w-full max-w-sm gap-1.5">
      <Label htmlFor="email">Email</Label>
      <Input type="email" id="email" placeholder="Email" />
    </div>
  ),
}

export const Disabled: Story = {
  args: {
    disabled: true,
    placeholder: 'Disabled input',
  },
}

export const WithValue: Story = {
  args: {
    defaultValue: 'LEGO MOC #12345',
  },
}

export const Password: Story = {
  args: {
    type: 'password',
    placeholder: 'Enter password',
  },
}

export const Search: Story = {
  args: {
    type: 'search',
    placeholder: 'Search MOCs...',
  },
}

export const FormExample: Story = {
  render: () => (
    <form className="grid w-[350px] gap-4">
      <div className="grid gap-1.5">
        <Label htmlFor="moc-name">MOC Name</Label>
        <Input id="moc-name" placeholder="Enter MOC name" />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="pieces">Piece Count</Label>
        <Input id="pieces" type="number" placeholder="1000" />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="designer">Designer</Label>
        <Input id="designer" placeholder="Your name" />
      </div>
    </form>
  ),
}
