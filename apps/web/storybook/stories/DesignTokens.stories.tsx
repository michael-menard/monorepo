import type { Meta, StoryObj } from '@storybook/react'

const meta: Meta = {
  title: 'Design Tokens/Colors',
  parameters: {
    docs: {
      description: {
        component: 'Design tokens for colors, spacing, typography, and other design elements used throughout the LEGO MOC platform.',
      },
    },
  },
}

export default meta
type Story = StoryObj<typeof meta>

// Color palette component
const ColorPalette = () => {
  const colors = [
    { name: 'Primary', class: 'bg-blue-600', hex: '#2563eb' },
    { name: 'Primary Light', class: 'bg-blue-500', hex: '#3b82f6' },
    { name: 'Primary Dark', class: 'bg-blue-700', hex: '#1d4ed8' },
    { name: 'Secondary', class: 'bg-gray-600', hex: '#4b5563' },
    { name: 'Success', class: 'bg-green-600', hex: '#16a34a' },
    { name: 'Warning', class: 'bg-yellow-500', hex: '#eab308' },
    { name: 'Error', class: 'bg-red-600', hex: '#dc2626' },
    { name: 'Background', class: 'bg-gray-50', hex: '#f9fafb' },
    { name: 'Surface', class: 'bg-white', hex: '#ffffff' },
    { name: 'Text Primary', class: 'bg-gray-900', hex: '#111827' },
    { name: 'Text Secondary', class: 'bg-gray-600', hex: '#4b5563' },
    { name: 'Border', class: 'bg-gray-200', hex: '#e5e7eb' },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {colors.map((color) => (
        <div key={color.name} className="text-center">
          <div className={`${color.class} w-full h-20 rounded-lg border border-gray-200 mb-2`} />
          <div className="text-sm font-medium">{color.name}</div>
          <div className="text-xs text-gray-500">{color.hex}</div>
        </div>
      ))}
    </div>
  )
}

// Spacing scale component
const SpacingScale = () => {
  const spacing = [
    { name: 'xs', size: '0.25rem', class: 'w-1' },
    { name: 'sm', size: '0.5rem', class: 'w-2' },
    { name: 'md', size: '1rem', class: 'w-4' },
    { name: 'lg', size: '1.5rem', class: 'w-6' },
    { name: 'xl', size: '2rem', class: 'w-8' },
    { name: '2xl', size: '3rem', class: 'w-12' },
    { name: '3xl', size: '4rem', class: 'w-16' },
  ]

  return (
    <div className="space-y-4">
      {spacing.map((space) => (
        <div key={space.name} className="flex items-center gap-4">
          <div className="w-12 text-sm font-medium">{space.name}</div>
          <div className={`${space.class} h-4 bg-blue-500 rounded`} />
          <div className="text-sm text-gray-600">{space.size}</div>
        </div>
      ))}
    </div>
  )
}

// Typography scale component
const TypographyScale = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold">Heading 1</h1>
        <p className="text-sm text-gray-600">text-4xl font-bold</p>
      </div>
      <div>
        <h2 className="text-3xl font-bold">Heading 2</h2>
        <p className="text-sm text-gray-600">text-3xl font-bold</p>
      </div>
      <div>
        <h3 className="text-2xl font-semibold">Heading 3</h3>
        <p className="text-sm text-gray-600">text-2xl font-semibold</p>
      </div>
      <div>
        <h4 className="text-xl font-semibold">Heading 4</h4>
        <p className="text-sm text-gray-600">text-xl font-semibold</p>
      </div>
      <div>
        <p className="text-base">Body Text</p>
        <p className="text-sm text-gray-600">text-base</p>
      </div>
      <div>
        <p className="text-sm">Small Text</p>
        <p className="text-sm text-gray-600">text-sm</p>
      </div>
      <div>
        <p className="text-xs">Extra Small Text</p>
        <p className="text-sm text-gray-600">text-xs</p>
      </div>
    </div>
  )
}

export const Colors: Story = {
  render: () => <ColorPalette />,
  parameters: {
    docs: {
      description: {
        story: 'Color palette used throughout the LEGO MOC platform.',
      },
    },
  },
}

export const Spacing: Story = {
  render: () => <SpacingScale />,
  parameters: {
    docs: {
      description: {
        story: 'Spacing scale based on Tailwind CSS spacing system.',
      },
    },
  },
}

export const Typography: Story = {
  render: () => <TypographyScale />,
  parameters: {
    docs: {
      description: {
        story: 'Typography scale with font sizes and weights.',
      },
    },
  },
}
