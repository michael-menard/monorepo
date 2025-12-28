import type { Meta, StoryObj } from '@storybook/react'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Button,
} from '@repo/ui'

const meta = {
  title: 'Components/Card',
  component: Card,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Card>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <Card className="w-[350px]">
      <CardHeader>
        <CardTitle>Card Title</CardTitle>
        <CardDescription>Card description goes here.</CardDescription>
      </CardHeader>
      <CardContent>
        <p>Card content with useful information.</p>
      </CardContent>
      <CardFooter>
        <Button>Action</Button>
      </CardFooter>
    </Card>
  ),
}

export const SimpleCard: Story = {
  render: () => (
    <Card className="w-[350px] p-6">
      <p>Simple card with just content</p>
    </Card>
  ),
}

export const MOCCard: Story = {
  render: () => (
    <Card className="w-[300px] overflow-hidden">
      <div className="h-48 bg-gradient-to-br from-sky-400 to-teal-400" />
      <CardHeader>
        <CardTitle>LEGO MOC #12345</CardTitle>
        <CardDescription>Custom spaceship design</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2 text-sm text-muted-foreground">
          <span>1,234 pieces</span>
          <span>•</span>
          <span>Expert</span>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" size="sm">
          Preview
        </Button>
        <Button size="sm">Download</Button>
      </CardFooter>
    </Card>
  ),
}

export const CardGrid: Story = {
  render: () => (
    <div className="grid grid-cols-2 gap-4">
      {[1, 2, 3, 4].map(i => (
        <Card key={i} className="w-[200px]">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">MOC #{i}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Sample card {i}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  ),
}
