import type { Meta, StoryObj } from '@storybook/react'
import { ErrorBoundary } from './error-boundary'
import { Button } from './button'

// Component that throws an error
const BuggyComponent = ({ shouldThrow = false }: { shouldThrow?: boolean }) => {
  if (shouldThrow) {
    throw new Error('This is a simulated error for testing the error boundary')
  }
  return <div>This component works normally</div>
}

// Component that throws an error on button click
const BuggyButton = () => {
  const handleClick = () => {
    throw new Error('Error thrown on button click')
  }
  return <Button onClick={handleClick}>Click to throw error</Button>
}

const meta: Meta<typeof ErrorBoundary> = {
  title: 'UI/ErrorBoundary',
  component: ErrorBoundary,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'An error boundary component that catches JavaScript errors anywhere in the child component tree.',
      },
    },
  },
  argTypes: {
    fallback: {
      control: { type: 'text' },
      description: 'Custom fallback component or message',
    },
    onError: {
      action: 'error',
      description: 'Callback function called when an error is caught',
    },
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <ErrorBoundary>
      <BuggyComponent shouldThrow={true} />
    </ErrorBoundary>
  ),
}

export const WithCustomFallback: Story = {
  render: () => (
    <ErrorBoundary
      fallback={
        <div className="p-4 border border-red-200 rounded-lg bg-red-50">
          <h3 className="text-red-800 font-medium">Something went wrong</h3>
          <p className="text-red-600 text-sm mt-1">
            We're sorry, but something unexpected happened. Please try refreshing the page.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={() => window.location.reload()}
          >
            Refresh Page
          </Button>
        </div>
      }
    >
      <BuggyComponent shouldThrow={true} />
    </ErrorBoundary>
  ),
}

export const WorkingComponent: Story = {
  render: () => (
    <ErrorBoundary>
      <BuggyComponent shouldThrow={false} />
    </ErrorBoundary>
  ),
}

export const WithErrorCallback: Story = {
  render: () => (
    <ErrorBoundary onError={(error, errorInfo) => {}}>
      <BuggyComponent shouldThrow={true} />
    </ErrorBoundary>
  ),
}

export const InteractiveError: Story = {
  render: () => (
    <ErrorBoundary
      fallback={
        <div className="p-4 border border-red-200 rounded-lg bg-red-50">
          <h3 className="text-red-800 font-medium">Error Caught!</h3>
          <p className="text-red-600 text-sm mt-1">
            An error occurred when you clicked the button.
          </p>
        </div>
      }
    >
      <div className="space-y-4">
        <p>Click the button below to trigger an error:</p>
        <BuggyButton />
      </div>
    </ErrorBoundary>
  ),
}

export const NestedErrorBoundaries: Story = {
  render: () => (
    <ErrorBoundary
      fallback={
        <div className="p-4 border border-blue-200 rounded-lg bg-blue-50">
          <h3 className="text-blue-800 font-medium">Outer Error Boundary</h3>
          <p className="text-blue-600 text-sm mt-1">
            This error was caught by the outer error boundary.
          </p>
        </div>
      }
    >
      <div className="space-y-4">
        <p>Outer boundary content</p>
        <ErrorBoundary
          fallback={
            <div className="p-4 border border-green-200 rounded-lg bg-green-50">
              <h3 className="text-green-800 font-medium">Inner Error Boundary</h3>
              <p className="text-green-600 text-sm mt-1">
                This error was caught by the inner error boundary.
              </p>
            </div>
          }
        >
          <BuggyComponent shouldThrow={true} />
        </ErrorBoundary>
      </div>
    </ErrorBoundary>
  ),
}

export const MultipleComponents: Story = {
  render: () => (
    <div className="space-y-4">
      <ErrorBoundary
        fallback={
          <div className="p-2 border border-red-200 rounded bg-red-50 text-red-800 text-sm">
            Component 1 Error
          </div>
        }
      >
        <BuggyComponent shouldThrow={true} />
      </ErrorBoundary>

      <ErrorBoundary
        fallback={
          <div className="p-2 border border-red-200 rounded bg-red-50 text-red-800 text-sm">
            Component 2 Error
          </div>
        }
      >
        <div>This component works fine</div>
      </ErrorBoundary>

      <ErrorBoundary
        fallback={
          <div className="p-2 border border-red-200 rounded bg-red-50 text-red-800 text-sm">
            Component 3 Error
          </div>
        }
      >
        <BuggyComponent shouldThrow={false} />
      </ErrorBoundary>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Multiple error boundaries handling different components independently.',
      },
    },
  },
}
