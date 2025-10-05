import type { Meta, StoryObj } from '@storybook/react'
import { ComponentShowcase } from './ComponentShowcase'

const meta: Meta<typeof ComponentShowcase> = {
  title: 'UI/ComponentShowcase',
  component: ComponentShowcase,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'A comprehensive showcase of all UI components in the design system.',
      },
    },
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => <ComponentShowcase />,
} 