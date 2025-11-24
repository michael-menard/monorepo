import type { Meta, StoryObj } from '@storybook/react'
import { MocCard, MocCardCompact, DifficultyBadge } from '../components/moc-card'
import { Button } from '../ui/button'

const meta: Meta<typeof MocCard> = {
  title: 'LEGO MOC/MocCard',
  component: MocCard,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: ['default', 'interactive', 'compact', 'featured'],
    },
    size: {
      control: { type: 'select' },
      options: ['default', 'sm', 'lg', 'compact'],
    },
  },
}

export default meta
type Story = StoryObj<typeof meta>

// Sample MOC data
const sampleMocData = {
  title: 'Medieval Castle',
  description: 'A detailed medieval castle with working drawbridge, multiple towers, and intricate interior details. Perfect for display or play.',
  imageUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=400&h=300&fit=crop',
  imageAlt: 'Medieval Castle MOC',
  metadata: {
    pieces: 2847,
    difficulty: 'Hard' as const,
    category: 'Castle',
    author: 'BrickMaster42',
  },
}

export const Default: Story = {
  args: {
    ...sampleMocData,
    actions: (
      <>
        <Button variant="lego-primary" size="sm">Add to Wishlist</Button>
        <Button variant="lego-outline" size="sm">View Details</Button>
      </>
    ),
  },
}

export const Interactive: Story = {
  args: {
    ...sampleMocData,
    variant: 'interactive',
    onCardClick: () => alert('Card clicked!'),
    actions: (
      <>
        <Button variant="lego-primary" size="sm">Download</Button>
        <Button variant="lego-ghost" size="sm">Share</Button>
      </>
    ),
  },
}

export const Featured: Story = {
  args: {
    ...sampleMocData,
    variant: 'featured',
    title: '🏆 Featured: Epic Space Station',
    description: 'Winner of the 2024 MOC Contest! This incredible space station features rotating sections, docking bays, and detailed interior modules.',
    metadata: {
      pieces: 4521,
      difficulty: 'Expert' as const,
      category: 'Space',
      author: 'SpaceBuilder99',
    },
    actions: (
      <>
        <Button variant="lego-primary" size="sm">Get Instructions</Button>
        <Button variant="lego-accent" size="sm">View Gallery</Button>
      </>
    ),
  },
}

export const WithoutImage: Story = {
  args: {
    title: 'Simple House MOC',
    description: 'A cozy family house with garden and garage. Great for beginners!',
    metadata: {
      pieces: 456,
      difficulty: 'Easy' as const,
      category: 'Buildings',
      author: 'NewBuilder',
    },
    actions: (
      <Button variant="lego-secondary" size="sm">View Instructions</Button>
    ),
  },
}

export const Compact: Story = {
  render: () => (
    <div className="w-96 space-y-3">
      <MocCardCompact
        title="Compact Castle"
        description="A smaller version of the medieval castle"
        imageUrl="https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=100&h=100&fit=crop"
        metadata={{
          pieces: 1200,
          difficulty: 'Medium' as const,
        }}
        actions={
          <>
            <Button variant="ghost" size="sm">♡</Button>
            <Button variant="ghost" size="sm">⋯</Button>
          </>
        }
        onCardClick={() => alert('Compact card clicked!')}
      />
      <MocCardCompact
        title="Space Shuttle"
        description="Detailed space shuttle with opening cargo bay"
        imageUrl="https://images.unsplash.com/photo-1446776653964-20c1d3a81b06?w=100&h=100&fit=crop"
        metadata={{
          pieces: 890,
          difficulty: 'Hard' as const,
        }}
        actions={
          <>
            <Button variant="ghost" size="sm">♡</Button>
            <Button variant="ghost" size="sm">⋯</Button>
          </>
        }
      />
    </div>
  ),
}

export const DifficultyBadges: Story = {
  render: () => (
    <div className="flex gap-4">
      <div className="text-center">
        <DifficultyBadge difficulty="Easy" />
        <p className="text-sm mt-2">Easy</p>
      </div>
      <div className="text-center">
        <DifficultyBadge difficulty="Medium" />
        <p className="text-sm mt-2">Medium</p>
      </div>
      <div className="text-center">
        <DifficultyBadge difficulty="Hard" />
        <p className="text-sm mt-2">Hard</p>
      </div>
      <div className="text-center">
        <DifficultyBadge difficulty="Expert" />
        <p className="text-sm mt-2">Expert</p>
      </div>
    </div>
  ),
}

export const Gallery: Story = {
  render: () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl">
      {Array.from({ length: 6 }).map((_, i) => (
        <MocCard
          key={i}
          title={`MOC ${i + 1}`}
          description="A sample MOC for gallery display"
          imageUrl={`https://images.unsplash.com/photo-${1518709268805 + i}?w=400&h=300&fit=crop`}
          metadata={{
            pieces: Math.floor(Math.random() * 3000) + 500,
            difficulty: ['Easy', 'Medium', 'Hard', 'Expert'][Math.floor(Math.random() * 4)] as any,
            category: ['Castle', 'Space', 'City', 'Technic'][Math.floor(Math.random() * 4)],
            author: `Builder${i + 1}`,
          }}
          actions={
            <>
              <Button variant="lego-primary" size="sm">View</Button>
              <Button variant="lego-ghost" size="sm">♡</Button>
            </>
          }
        />
      ))}
    </div>
  ),
}
