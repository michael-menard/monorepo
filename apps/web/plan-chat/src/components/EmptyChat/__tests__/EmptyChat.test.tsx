import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { EmptyChat } from '../index'

describe('EmptyChat', () => {
  it('renders heading text', () => {
    render(<EmptyChat />)
    expect(screen.getByText('No conversation selected')).toBeInTheDocument()
  })

  it('renders help text', () => {
    render(<EmptyChat />)
    expect(
      screen.getByText(/Start typing below or click.*New Chat.*to begin/),
    ).toBeInTheDocument()
  })
})
