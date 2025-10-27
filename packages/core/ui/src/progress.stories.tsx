import type { Meta, StoryObj } from '@storybook/react'
import { Progress } from './progress'

const meta: Meta<typeof Progress> = {
  title: 'UI/Progress',
  component: Progress,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'A progress bar component for displaying completion status.',
      },
    },
  },
  argTypes: {
    value: {
      control: { type: 'range', min: 0, max: 100, step: 1 },
      description: 'The current progress value (0-100)',
    },
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    value: 33,
  },
}

export const Complete: Story = {
  args: {
    value: 100,
  },
}

export const Empty: Story = {
  args: {
    value: 0,
  },
}

export const Halfway: Story = {
  args: {
    value: 50,
  },
}

export const AlmostComplete: Story = {
  args: {
    value: 85,
  },
}

export const WithLabel: Story = {
  render: () => (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span>Upload Progress</span>
        <span>33%</span>
      </div>
      <Progress value={33} />
    </div>
  ),
}

export const MultipleProgressBars: Story = {
  render: () => (
    <div className="space-y-6 w-[400px]">
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>File Upload</span>
          <span>75%</span>
        </div>
        <Progress value={75} />
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Data Processing</span>
          <span>45%</span>
        </div>
        <Progress value={45} />
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Validation</span>
          <span>90%</span>
        </div>
        <Progress value={90} />
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Finalization</span>
          <span>100%</span>
        </div>
        <Progress value={100} />
      </div>
    </div>
  ),
}

export const DifferentSizes: Story = {
  render: () => (
    <div className="space-y-6 w-[400px]">
      <div className="space-y-2">
        <span className="text-sm font-medium">Small Progress</span>
        <Progress value={60} className="h-1" />
      </div>

      <div className="space-y-2">
        <span className="text-sm font-medium">Default Progress</span>
        <Progress value={60} />
      </div>

      <div className="space-y-2">
        <span className="text-sm font-medium">Large Progress</span>
        <Progress value={60} className="h-4" />
      </div>
    </div>
  ),
}

export const CustomColors: Story = {
  render: () => (
    <div className="space-y-6 w-[400px]">
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Success Progress</span>
          <span>80%</span>
        </div>
        <Progress value={80} className="bg-green-100" />
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Warning Progress</span>
          <span>60%</span>
        </div>
        <Progress value={60} className="bg-yellow-100" />
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Error Progress</span>
          <span>30%</span>
        </div>
        <Progress value={30} className="bg-red-100" />
      </div>
    </div>
  ),
}

export const AnimatedProgress: Story = {
  render: () => (
    <div className="space-y-6 w-[400px]">
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Loading...</span>
          <span>Indeterminate</span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div className="h-full bg-blue-600 rounded-full animate-pulse"></div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Processing</span>
          <span>45%</span>
        </div>
        <Progress value={45} />
      </div>
    </div>
  ),
}
