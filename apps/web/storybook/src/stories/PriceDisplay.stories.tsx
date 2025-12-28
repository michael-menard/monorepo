/**
 * PriceDisplay Storybook Stories
 *
 * Story wish-2003: Detail & Edit Pages
 */

import type { Meta, StoryObj } from '@storybook/react'
import { PriceDisplay } from '@repo/app-wishlist-gallery/components/PriceDisplay'

const meta: Meta<typeof PriceDisplay> = {
  title: 'Wishlist/PriceDisplay',
  component: PriceDisplay,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    price: {
      control: 'text',
      description: 'Price value as string (decimal format)',
    },
    currency: {
      control: 'select',
      options: ['USD', 'EUR', 'GBP', 'CAD', 'AUD'],
      description: 'Currency code (ISO 4217)',
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

// USD Currency
export const USD: Story = {
  args: {
    price: '849.99',
    currency: 'USD',
    size: 'md',
  },
}

// EUR Currency
export const EUR: Story = {
  args: {
    price: '749.99',
    currency: 'EUR',
    size: 'md',
  },
}

// GBP Currency
export const GBP: Story = {
  args: {
    price: '599.99',
    currency: 'GBP',
    size: 'md',
  },
}

// No Price (null handling)
export const NoPrice: Story = {
  args: {
    price: null,
    currency: 'USD',
    size: 'md',
  },
  parameters: {
    docs: {
      description: {
        story: 'When price is null, the component renders nothing.',
      },
    },
  },
}

// Small size
export const Small: Story = {
  args: {
    price: '99.99',
    currency: 'USD',
    size: 'sm',
  },
}

// Large size
export const Large: Story = {
  args: {
    price: '1299.99',
    currency: 'USD',
    size: 'lg',
  },
}

// Whole number (no decimals)
export const WholeNumber: Story = {
  args: {
    price: '500',
    currency: 'USD',
    size: 'md',
  },
}

// All sizes comparison
export const AllSizes: Story = {
  args: {
    price: '99.99',
    currency: 'USD',
    size: 'md',
  },
  render: () => (
    <div className="flex items-center gap-6">
      <div className="text-center">
        <p className="text-sm text-muted-foreground mb-2">Small</p>
        <PriceDisplay price="99.99" currency="USD" size="sm" />
      </div>
      <div className="text-center">
        <p className="text-sm text-muted-foreground mb-2">Medium</p>
        <PriceDisplay price="99.99" currency="USD" size="md" />
      </div>
      <div className="text-center">
        <p className="text-sm text-muted-foreground mb-2">Large</p>
        <PriceDisplay price="99.99" currency="USD" size="lg" />
      </div>
    </div>
  ),
}

// All currencies comparison
export const AllCurrencies: Story = {
  args: {
    price: '849.99',
    currency: 'USD',
    size: 'md',
  },
  render: () => (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <span className="w-12 text-sm text-muted-foreground">USD:</span>
        <PriceDisplay price="849.99" currency="USD" size="md" />
      </div>
      <div className="flex items-center gap-4">
        <span className="w-12 text-sm text-muted-foreground">EUR:</span>
        <PriceDisplay price="849.99" currency="EUR" size="md" />
      </div>
      <div className="flex items-center gap-4">
        <span className="w-12 text-sm text-muted-foreground">GBP:</span>
        <PriceDisplay price="849.99" currency="GBP" size="md" />
      </div>
      <div className="flex items-center gap-4">
        <span className="w-12 text-sm text-muted-foreground">CAD:</span>
        <PriceDisplay price="849.99" currency="CAD" size="md" />
      </div>
      <div className="flex items-center gap-4">
        <span className="w-12 text-sm text-muted-foreground">AUD:</span>
        <PriceDisplay price="849.99" currency="AUD" size="md" />
      </div>
    </div>
  ),
}
