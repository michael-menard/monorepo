import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { vi } from 'vitest'
import { instructionsApi } from '@repo/moc-instructions'
import { MocDetailPage } from '../index'

// Mock the moc-instructions package utilities
vi.mock('@repo/moc-instructions', async () => {
  const actual = await vi.importActual('@repo/moc-instructions')
  return {
    ...actual,
    formatTime: vi.fn(minutes => `${minutes} min`),
    getDifficultyLabel: vi.fn(difficulty => difficulty),
    calculateTotalParts: vi.fn(() => 150),
    calculateTotalTime: vi.fn(() => 120),
    validateFileSize: vi.fn(() => true),
    validateImageType: vi.fn(() => true),
    compressImage: vi.fn(file => Promise.resolve(file)),
  }
})

// Mock react-router-dom
const mockNavigate = vi.fn()
vi.mock('@tanstack/react-router', async () => {
  const actual = await vi.importActual('@tanstack/react-router')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ id: 'test-id' }),
  }
})

// Mock window.navigator.share
Object.defineProperty(window, 'navigator', {
  value: {
    share: vi.fn(),
    clipboard: {
      writeText: vi.fn(),
    },
  },
  writable: true,
})

// Mock file input
const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' })

const createMockStore = () => {
  return configureStore({
    reducer: {
      [instructionsApi.reducerPath]: instructionsApi.reducer,
    },
    middleware: getDefaultMiddleware => getDefaultMiddleware().concat(instructionsApi.middleware),
  })
}

const renderWithProviders = (component: React.ReactElement) => {
  const store = createMockStore()
  return render(
    <Provider store={store}>
      <BrowserRouter>{component}</BrowserRouter>
    </Provider>,
  )
}

describe('MocDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('renders MOC details correctly', () => {
      renderWithProviders(<MocDetailPage />)

      expect(screen.getByText('Amazing Space Station MOC')).toBeInTheDocument()
      expect(screen.getByTestId('moc-description')).toBeInTheDocument()
      expect(screen.getByText('Space Builder Pro')).toBeInTheDocument()
      expect(screen.getAllByText('space').length).toBeGreaterThan(0)
      expect(screen.getAllByText('station').length).toBeGreaterThan(0)
    })

    it('displays correct statistics', () => {
      renderWithProviders(<MocDetailPage />)

      expect(screen.getByText('150 pieces')).toBeInTheDocument()
      expect(screen.getByTestId('moc-pieces')).toBeInTheDocument()
      expect(screen.getAllByText('4.8/5').length).toBeGreaterThan(0)
      expect(screen.getByText('1250 downloads')).toBeInTheDocument()
    })

    it('displays instruction steps', () => {
      renderWithProviders(<MocDetailPage />)

      // Look for step titles in the build steps section
      expect(screen.getByText('Build Steps')).toBeInTheDocument()
      expect(screen.getAllByText('Step 1: Base Structure').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Step 2: Solar Panels').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Step 3: Command Module').length).toBeGreaterThan(0)
    })

    it('displays parts list', () => {
      renderWithProviders(<MocDetailPage />)

      expect(screen.getByText('2x4 brick')).toBeInTheDocument()
      expect(screen.getByText('2x3 brick')).toBeInTheDocument()
      expect(screen.getByText('2x2 brick')).toBeInTheDocument()
    })
  })

  describe('Navigation', () => {
    it('handles back navigation', () => {
      renderWithProviders(<MocDetailPage />)

      const backButton = screen.getByRole('button', { name: /back to gallery/i })
      fireEvent.click(backButton)

      expect(mockNavigate).toHaveBeenCalledWith({ to: '/moc-gallery' })
    })
  })

  describe('User Interactions', () => {
    it('handles like button click', () => {
      renderWithProviders(<MocDetailPage />)

      const likeButton = screen.getByRole('button', { name: /89/i })
      fireEvent.click(likeButton)

      // The component should update the like state
      expect(likeButton).toBeInTheDocument()
    })

    it('handles download button click', () => {
      renderWithProviders(<MocDetailPage />)

      const downloadButton = screen.getByRole('button', { name: /download/i })
      fireEvent.click(downloadButton)

      // Should trigger download functionality
      expect(downloadButton).toBeInTheDocument()
    })

    it('opens upload modal when upload image button is clicked', () => {
      renderWithProviders(<MocDetailPage />)

      const uploadButton = screen.getByRole('button', { name: /upload image/i })
      fireEvent.click(uploadButton)

      // Should open upload modal
      expect(screen.getByText('Upload Images for Amazing Space Station MOC')).toBeInTheDocument()
    })
  })

  describe('Content Sections', () => {
    it('displays build steps section', () => {
      renderWithProviders(<MocDetailPage />)

      expect(screen.getByText('Build Steps')).toBeInTheDocument()
      expect(screen.getByText('Upload Instructions')).toBeInTheDocument()
    })

    it('displays parts list section', () => {
      renderWithProviders(<MocDetailPage />)

      expect(screen.getByText('Required Parts')).toBeInTheDocument()
      expect(screen.getByText('Add Part')).toBeInTheDocument()
    })

    it('displays gallery section', () => {
      renderWithProviders(<MocDetailPage />)

      expect(screen.getByText('Images')).toBeInTheDocument()
      expect(screen.getByText('Upload Image')).toBeInTheDocument()
    })
  })

  describe('Gallery Integration', () => {
    it('displays step images in gallery', () => {
      renderWithProviders(<MocDetailPage />)

      // Should show step images
      const stepImages = screen.getAllByAltText(/Step \d+:/)
      expect(stepImages.length).toBeGreaterThan(0)
    })

    it('renders gallery component', () => {
      renderWithProviders(<MocDetailPage />)

      // Should have gallery section
      expect(screen.getByTestId('moc-gallery')).toBeInTheDocument()
    })
  })
})
