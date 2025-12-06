import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import * as React from 'react'

// Mock @repo/app-component-library with cn for LoadingPage
vi.mock('@repo/app-component-library', async () => {
  const actual = await vi.importActual('@repo/app-component-library')
  return {
    ...actual,
    cn: (...classes: (string | undefined | boolean)[]) => classes.filter(Boolean).join(' '),
    ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
    useTheme: () => ({ theme: 'light', setTheme: vi.fn() }),
  }
})

// Mock the lazy-loaded module
vi.mock('@repo/app-instructions-gallery', () => ({
  default: () =>
    React.createElement('div', null, [
      React.createElement('h1', { key: 'h1' }, 'My Instructions'),
      React.createElement('p', { key: 'p' }, 'Browse your MOC instruction collection'),
    ]),
}))

// Import after mocks
import { InstructionsModule } from '../InstructionsModule'

describe('InstructionsModule', () => {
  it('renders the instructions gallery page after loading', async () => {
    render(<InstructionsModule />)

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { level: 1, name: /my instructions/i }),
      ).toBeInTheDocument()
      expect(screen.getByText(/browse your moc instruction collection/i)).toBeInTheDocument()
    })
  })

  it('has proper semantic structure', async () => {
    render(<InstructionsModule />)

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
    })
  })
})
