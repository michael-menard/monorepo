import type { Meta, StoryObj } from '@storybook/react'
import { MultiSelect } from '../selects/multi-select'
import { Label } from '../base/primitives/label'

const meta: Meta<typeof MultiSelect> = {
  title: 'UI/MultiSelect',
  component: MultiSelect,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'A multi-select component for choosing multiple options from a list.',
      },
    },
  },
  argTypes: {
    placeholder: {
      control: { type: 'text' },
      description: 'Placeholder text when no options are selected',
    },
    disabled: {
      control: { type: 'boolean' },
      description: 'Whether the component is disabled',
    },
    // Removed maxSelected as it doesn't exist in the component interface
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof meta>

const fruits = [
  { value: 'apple', label: 'Apple' },
  { value: 'banana', label: 'Banana' },
  { value: 'blueberry', label: 'Blueberry' },
  { value: 'grapes', label: 'Grapes' },
  { value: 'pineapple', label: 'Pineapple' },
  { value: 'strawberry', label: 'Strawberry' },
  { value: 'orange', label: 'Orange' },
  { value: 'mango', label: 'Mango' },
]

const countries = [
  { value: 'us', label: 'United States' },
  { value: 'ca', label: 'Canada' },
  { value: 'uk', label: 'United Kingdom' },
  { value: 'fr', label: 'France' },
  { value: 'de', label: 'Germany' },
  { value: 'es', label: 'Spain' },
  { value: 'it', label: 'Italy' },
  { value: 'jp', label: 'Japan' },
  { value: 'kr', label: 'South Korea' },
  { value: 'cn', label: 'China' },
  { value: 'in', label: 'India' },
  { value: 'au', label: 'Australia' },
]

const skills = [
  { value: 'react', label: 'React' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'node', label: 'Node.js' },
  { value: 'python', label: 'Python' },
  { value: 'java', label: 'Java' },
  { value: 'csharp', label: 'C#' },
  { value: 'go', label: 'Go' },
  { value: 'rust', label: 'Rust' },
  { value: 'swift', label: 'Swift' },
  { value: 'kotlin', label: 'Kotlin' },
  { value: 'php', label: 'PHP' },
]

export const Default: Story = {
  args: {
    options: fruits,
    placeholder: 'Select fruits...',
  },
}

export const WithLabel: Story = {
  render: args => (
    <div className="grid w-full max-w-sm items-center gap-1.5">
      <Label htmlFor="fruits">Favorite Fruits</Label>
      <MultiSelect {...args} />
    </div>
  ),
  args: {
    options: fruits,
    placeholder: 'Select your favorite fruits...',
  },
}

export const WithDefaultValue: Story = {
  args: {
    options: fruits,
    placeholder: 'Select fruits...',
    selectedValues: ['apple', 'banana'],
  },
}

export const Disabled: Story = {
  args: {
    options: fruits,
    placeholder: 'Disabled multi-select',
    disabled: true,
  },
}

export const WithMaxSelected: Story = {
  args: {
    options: fruits,
    placeholder: 'Select up to 3 fruits...',
    // Removed maxSelected as it doesn't exist in the component interface
  },
}

export const Countries: Story = {
  args: {
    options: countries,
    placeholder: 'Select countries...',
  },
  parameters: {
    docs: {
      description: {
        story: 'Multi-select with a larger list of countries.',
      },
    },
  },
}

export const Skills: Story = {
  args: {
    options: skills,
    placeholder: 'Select your skills...',
  },
  parameters: {
    docs: {
      description: {
        story: 'Multi-select for selecting programming skills.',
      },
    },
  },
}

export const WithSearch: Story = {
  args: {
    options: countries,
    placeholder: 'Search and select countries...',
    searchable: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Multi-select with search functionality enabled.',
      },
    },
  },
}

export const Compact: Story = {
  args: {
    options: fruits,
    placeholder: 'Select fruits...',
    className: 'w-[200px]',
  },
  parameters: {
    docs: {
      description: {
        story: 'Compact multi-select with reduced width.',
      },
    },
  },
}

export const Large: Story = {
  args: {
    options: fruits,
    placeholder: 'Select fruits...',
    className: 'w-[400px]',
  },
  parameters: {
    docs: {
      description: {
        story: 'Large multi-select with increased width.',
      },
    },
  },
}
