import type { Meta, StoryObj } from '@storybook/react'
import { ConfirmationDialog } from './ConfirmationDialog'
import { Button } from './button'

const meta: Meta<typeof ConfirmationDialog> = {
  title: 'UI/ConfirmationDialog',
  component: ConfirmationDialog,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'A confirmation dialog component for confirming destructive actions.',
      },
    },
  },
  argTypes: {
    title: {
      control: { type: 'text' },
      description: 'The title of the confirmation dialog',
    },
    description: {
      control: { type: 'text' },
      description: 'The description text explaining the action',
    },
    confirmText: {
      control: { type: 'text' },
      description: 'Text for the confirm button',
    },
    cancelText: {
      control: { type: 'text' },
      description: 'Text for the cancel button',
    },
    variant: {
      control: { type: 'select' },
      options: ['default', 'destructive'],
      description: 'The variant of the confirm button',
    },
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <ConfirmationDialog
      title="Are you sure?"
      description="This action cannot be undone. This will permanently delete your account and remove your data from our servers."
      confirmText="Delete Account"
      cancelText="Cancel"
      variant="destructive"
      onConfirm={() => {
        // Handler removed
      }
      onCancel={() => {
        // Handler removed
      }
    />
  ),
}

export const SimpleConfirmation: Story = {
  render: () => (
    <ConfirmationDialog
      title="Confirm Action"
      description="Are you sure you want to proceed with this action?"
      confirmText="Proceed"
      cancelText="Cancel"
      onConfirm={() => {
        // Handler removed
      }
      onCancel={() => {
        // Handler removed
      }
    />
  ),
}

export const FileDeletion: Story = {
  render: () => (
    <ConfirmationDialog
      title="Delete File"
      description="Are you sure you want to delete 'important-document.pdf'? This action cannot be undone."
      confirmText="Delete File"
      cancelText="Keep File"
      variant="destructive"
      onConfirm={() => {
        // Handler removed
      }
      onCancel={() => {
        // Handler removed
      }
    />
  ),
}

export const LogoutConfirmation: Story = {
  render: () => (
    <ConfirmationDialog
      title="Sign Out"
      description="Are you sure you want to sign out? You will need to sign in again to access your account."
      confirmText="Sign Out"
      cancelText="Stay Signed In"
      onConfirm={() => {
        // Handler removed
      }
      onCancel={() => {
        // Handler removed
      }
    />
  ),
}

export const UnsavedChanges: Story = {
  render: () => (
    <ConfirmationDialog
      title="Unsaved Changes"
      description="You have unsaved changes. Are you sure you want to leave? Your changes will be lost."
      confirmText="Leave Page"
      cancelText="Stay and Save"
      variant="destructive"
      onConfirm={() => {
        // Handler removed
      }
      onCancel={() => {
        // Handler removed
      }
    />
  ),
}

export const CustomStyling: Story = {
  render: () => (
    <ConfirmationDialog
      title="Custom Styled Dialog"
      description="This dialog has custom styling applied to demonstrate the flexibility of the component."
      confirmText="Custom Action"
      cancelText="Cancel"
      onConfirm={() => {
        // Handler removed
      }
      onCancel={() => {
        // Handler removed
      }
    />
  ),
}
