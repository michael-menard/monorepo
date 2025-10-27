import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import ProfileTabs from '../index'

// Mock the UI components
vi.mock('@repo/ui', () => ({
  Tabs: ({ children, defaultValue, className }: any) => (
    <div data-testid="tabs" data-default-value={defaultValue} className={className}>
      {children}
    </div>
  ),
  TabsList: ({ children, className }: any) => (
    <div data-testid="tabs-list" className={className}>
      {children}
    </div>
  ),
  TabsTrigger: ({ children, value, className }: any) => (
    <button data-testid={`tab-trigger-${value}`} className={className}>
      {children}
    </button>
  ),
  TabsContent: ({ children, value }: any) => (
    <div data-testid={`tab-content-${value}`}>{children}</div>
  ),
}))

// Mock the tab components
vi.mock('../InstructionsTab', () => ({
  InstructionsTab: () => <div data-testid="instructions-tab">Instructions Content</div>,
}))

vi.mock('../WishlistTab', () => ({
  WishlistTab: () => <div data-testid="wishlist-tab">Wishlist Content</div>,
}))

vi.mock('../InspirationGalleryTab', () => ({
  InspirationGalleryTab: () => (
    <div data-testid="inspiration-gallery-tab">Inspiration Gallery Content</div>
  ),
}))

vi.mock('../SettingsTab', () => ({
  SettingsTab: () => <div data-testid="settings-tab">Settings Content</div>,
}))

describe('ProfileTabs', () => {
  it('renders all tab triggers', () => {
    render(<ProfileTabs />)

    expect(screen.getByTestId('tab-trigger-instructions')).toBeInTheDocument()
    expect(screen.getByTestId('tab-trigger-wishlist')).toBeInTheDocument()
    expect(screen.getByTestId('tab-trigger-inspiration-gallery')).toBeInTheDocument()
    expect(screen.getByTestId('tab-trigger-settings')).toBeInTheDocument()
  })

  it('renders tab content areas', () => {
    render(<ProfileTabs />)

    expect(screen.getByTestId('tab-content-instructions')).toBeInTheDocument()
    expect(screen.getByTestId('tab-content-wishlist')).toBeInTheDocument()
    expect(screen.getByTestId('tab-content-inspiration-gallery')).toBeInTheDocument()
    expect(screen.getByTestId('tab-content-settings')).toBeInTheDocument()
  })

  it('renders tab content components', () => {
    render(<ProfileTabs />)

    expect(screen.getByTestId('instructions-tab')).toBeInTheDocument()
    expect(screen.getByTestId('wishlist-tab')).toBeInTheDocument()
    expect(screen.getByTestId('inspiration-gallery-tab')).toBeInTheDocument()
    expect(screen.getByTestId('settings-tab')).toBeInTheDocument()
  })

  it('uses default tab value', () => {
    render(<ProfileTabs />)

    const tabsElement = screen.getByTestId('tabs')
    expect(tabsElement).toHaveAttribute('data-default-value', 'instructions')
  })

  it('uses custom default tab value', () => {
    render(<ProfileTabs defaultTab="wishlist" />)

    const tabsElement = screen.getByTestId('tabs')
    expect(tabsElement).toHaveAttribute('data-default-value', 'wishlist')
  })

  it('applies custom className', () => {
    render(<ProfileTabs className="custom-class" />)

    const tabsElement = screen.getByTestId('tabs')
    expect(tabsElement).toHaveClass('custom-class')
  })

  it('renders correct tab labels', () => {
    render(<ProfileTabs />)

    expect(screen.getByText('Instructions')).toBeInTheDocument()
    expect(screen.getByText('Wishlist')).toBeInTheDocument()
    expect(screen.getByText('Inspiration Gallery')).toBeInTheDocument()
    expect(screen.getByText('Settings')).toBeInTheDocument()
  })
})
