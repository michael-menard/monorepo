/**
 * DeleteConfirmationModal Stories
 *
 * Story wish-2004: Delete Confirmation Modal
 */

import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import { Button } from '@repo/ui'
import { DeleteConfirmationModal, type DeleteConfirmationModalProps } from '../index'

/**
 * Wrapper component for controlled story state
 */
function DeleteConfirmationModalStory(props: Omit<DeleteConfirmationModalProps, 'open' | 'onOpenChange'>) {
  const [open, setOpen] = useState(true)

  return (
    <div>
      <Button onClick={() => setOpen(true)}>Open Delete Modal</Button>
      <DeleteConfirmationModal
        {...props}
        open={open}
        onOpenChange={setOpen}
      />
    </div>
  )
}

const meta: Meta<typeof DeleteConfirmationModal> = {
  title: 'Wishlist/DeleteConfirmationModal',
  component: DeleteConfirmationModal,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Confirmation modal for permanently removing a wishlist item. Uses destructive styling to emphasize the permanent nature of the action.',
      },
    },
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <DeleteConfirmationModalStory
      itemId="123e4567-e89b-12d3-a456-426614174000"
      itemTitle="LEGO Star Wars Millennium Falcon"
      onDeleted={() => {
        // Storybook action
      }}
    />
  ),
}

export const LongTitle: Story = {
  render: () => (
    <DeleteConfirmationModalStory
      itemId="123e4567-e89b-12d3-a456-426614174000"
      itemTitle="LEGO Star Wars Ultimate Collector Series Imperial Star Destroyer Set #75252"
      onDeleted={() => {
        // Storybook action
      }}
    />
  ),
}

export const ShortTitle: Story = {
  render: () => (
    <DeleteConfirmationModalStory
      itemId="123e4567-e89b-12d3-a456-426614174000"
      itemTitle="X-Wing"
      onDeleted={() => {
        // Storybook action
      }}
    />
  ),
}
