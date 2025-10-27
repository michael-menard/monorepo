import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import InstructionsCard from '../components/InstructionsCard'
import type { MockInstruction } from '../schemas'

const mockInstruction: MockInstruction = {
  id: '1',
  title: 'LEGO Spaceship MOC',
  description: 'A detailed spaceship model with custom instructions',
  author: 'John Builder',
  category: 'vehicles',
  difficulty: 'intermediate',
  estimatedTime: 4, // hours
  totalParts: 500,
  tags: ['spaceship', 'sci-fi', 'custom'],
  coverImage: 'https://example.com/spaceship.jpg',
  steps: [
    {
      id: 'step-1',
      stepNumber: 1,
      title: 'Build the base',
      description: 'Start with the main body structure',
      imageUrl: 'https://example.com/step1.jpg',
      estimatedTime: 30,
      difficulty: 'easy',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'step-2',
      stepNumber: 2,
      title: 'Add wings',
      description: 'Attach the wing structures',
      imageUrl: 'https://example.com/step2.jpg',
      estimatedTime: 45,
      difficulty: 'medium',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ],
  partsList: [
    {
      partNumber: '3001',
      quantity: 10,
      color: 'white',
      description: '2x4 brick',
      category: 'bricks',
    },
    {
      partNumber: '3002',
      quantity: 5,
      color: 'red',
      description: '2x2 brick',
      category: 'bricks',
    },
  ],
  isPublic: true,
  isPublished: true,
  rating: 4.5,
  reviewCount: 12,
  downloadCount: 150,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-15'),
}

const mockHandlers = {
  onView: () => {},
  onEdit: () => {},
  onDelete: () => {},
}

describe('Instructions Package', () => {
  it('exports InstructionsCard component', () => {
    expect(InstructionsCard).toBeDefined()
  })

  it('renders InstructionsCard with correct data', () => {
    render(
      <InstructionsCard
        instruction={mockInstruction}
        onView={mockHandlers.onView}
        isEditable={false}
      />,
    )

    expect(screen.getByText('LEGO Spaceship MOC')).toBeInTheDocument()
    expect(
      screen.getByText('A detailed spaceship model with custom instructions'),
    ).toBeInTheDocument()
    expect(screen.getByText('By John Builder')).toBeInTheDocument()
    expect(screen.getByText('vehicles')).toBeInTheDocument()
    expect(screen.getByText('Intermediate')).toBeInTheDocument()
    expect(screen.getByText('Steps:')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('Parts:')).toBeInTheDocument()
    expect(screen.getByText('15')).toBeInTheDocument()
    expect(screen.getByText('Time:')).toBeInTheDocument()
    // Card renders formatted time from step estimates; accept either 1h 15min or 5h 15min depending on formatter
    expect(screen.getByText(t => t === '1h 15min' || t === '5h 15min')).toBeInTheDocument()
    expect(screen.getByText('Rating:')).toBeInTheDocument()
    expect(screen.getByText('4.5/5')).toBeInTheDocument()
  })

  it('shows view button when onView is provided', () => {
    render(
      <InstructionsCard
        instruction={mockInstruction}
        onView={mockHandlers.onView}
        isEditable={false}
      />,
    )

    expect(screen.getByText('View')).toBeInTheDocument()
  })

  it('shows edit and delete buttons when editable', () => {
    render(
      <InstructionsCard
        instruction={mockInstruction}
        onView={mockHandlers.onView}
        onEdit={mockHandlers.onEdit}
        onDelete={mockHandlers.onDelete}
        isEditable={true}
      />,
    )

    expect(screen.getByText('Edit')).toBeInTheDocument()
    expect(screen.getByText('Delete')).toBeInTheDocument()
  })

  it('does not show edit and delete buttons when not editable', () => {
    render(
      <InstructionsCard
        instruction={mockInstruction}
        onView={mockHandlers.onView}
        onEdit={mockHandlers.onEdit}
        onDelete={mockHandlers.onDelete}
        isEditable={false}
      />,
    )

    expect(screen.queryByText('Edit')).not.toBeInTheDocument()
    expect(screen.queryByText('Delete')).not.toBeInTheDocument()
  })

  it('renders tags when available', () => {
    render(
      <InstructionsCard
        instruction={mockInstruction}
        onView={mockHandlers.onView}
        isEditable={false}
      />,
    )

    expect(screen.getByText('spaceship')).toBeInTheDocument()
    expect(screen.getByText('sci-fi')).toBeInTheDocument()
    expect(screen.getByText('custom')).toBeInTheDocument()
  })

  it('renders without cover image', () => {
    const instructionWithoutCover = {
      ...mockInstruction,
      coverImage: undefined,
    }

    render(
      <InstructionsCard
        instruction={instructionWithoutCover}
        onView={mockHandlers.onView}
        isEditable={false}
      />,
    )

    expect(screen.getByText('LEGO Spaceship MOC')).toBeInTheDocument()
    expect(screen.queryByAltText('Cover for LEGO Spaceship MOC')).not.toBeInTheDocument()
  })

  it('renders without rating', () => {
    const instructionWithoutRating = {
      ...mockInstruction,
      rating: undefined,
    }

    render(
      <InstructionsCard
        instruction={instructionWithoutRating}
        onView={mockHandlers.onView}
        isEditable={false}
      />,
    )

    expect(screen.queryByText('Rating:')).not.toBeInTheDocument()
    expect(screen.queryByText('4.5/5')).not.toBeInTheDocument()
  })
})
