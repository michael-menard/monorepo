import type { Meta, StoryObj } from '@storybook/react'
import {
  Skeleton,
  CardSkeleton,
  AvatarSkeleton,
  TextSkeleton,
  TableSkeleton,
  ListSkeleton,
  FormSkeleton,
} from './skeleton'
import { Card, CardContent, CardHeader } from './card'

const meta: Meta<typeof Skeleton> = {
  title: 'UI/Skeleton',
  component: Skeleton,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Skeleton components for loading states and placeholders.',
      },
    },
  },
  argTypes: {
    className: {
      control: { type: 'text' },
      description: 'Additional CSS classes',
    },
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    className: 'h-4 w-[250px]',
  },
}

export const Avatar: Story = {
  render: () => <AvatarSkeleton />,
}

export const Text: Story = {
  render: () => <TextSkeleton />,
}

export const CardSkeletonStory: Story = {
  render: () => <CardSkeleton />,
}

export const Table: Story = {
  render: () => <TableSkeleton />,
}

export const List: Story = {
  render: () => <ListSkeleton />,
}

export const Form: Story = {
  render: () => <FormSkeleton />,
}

export const MultipleLines: Story = {
  render: () => (
    <div className="space-y-3">
      <Skeleton className="h-4 w-[250px]" />
      <Skeleton className="h-4 w-[200px]" />
      <Skeleton className="h-4 w-[300px]" />
    </div>
  ),
}

export const CardWithSkeleton: Story = {
  render: () => (
    <Card className="w-[350px]">
      <CardHeader>
        <Skeleton className="h-6 w-[200px]" />
        <Skeleton className="h-4 w-[150px]" />
      </CardHeader>
      <CardContent className="space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-[80%]" />
        <Skeleton className="h-4 w-[60%]" />
      </CardContent>
    </Card>
  ),
}

export const ProfileSkeleton: Story = {
  render: () => (
    <div className="flex items-center space-x-4">
      <AvatarSkeleton />
      <div className="space-y-2">
        <Skeleton className="h-4 w-[150px]" />
        <Skeleton className="h-4 w-[100px]" />
      </div>
    </div>
  ),
}

export const ArticleSkeleton: Story = {
  render: () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Skeleton className="h-8 w-[300px]" />
        <Skeleton className="h-4 w-[200px]" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-[80%]" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-[90%]" />
      </div>
    </div>
  ),
}

export const DashboardSkeleton: Story = {
  render: () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <CardSkeleton />
      <CardSkeleton />
      <CardSkeleton />
      <CardSkeleton />
      <CardSkeleton />
      <CardSkeleton />
    </div>
  ),
}

export const TableWithSkeleton: Story = {
  render: () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Skeleton className="h-6 w-[150px]" />
        <Skeleton className="h-8 w-[100px]" />
      </div>
      <TableSkeleton />
    </div>
  ),
}

export const FormWithSkeleton: Story = {
  render: () => (
    <div className="space-y-4">
      <Skeleton className="h-6 w-[200px]" />
      <FormSkeleton />
    </div>
  ),
}

export const DifferentSizes: Story = {
  render: () => (
    <div className="space-y-4">
      <Skeleton className="h-2 w-[100px]" />
      <Skeleton className="h-4 w-[150px]" />
      <Skeleton className="h-6 w-[200px]" />
      <Skeleton className="h-8 w-[250px]" />
      <Skeleton className="h-10 w-[300px]" />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Skeleton components in different sizes for various use cases.',
      },
    },
  },
} 