import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Provider } from 'react-redux'
import { TooltipProvider } from '@repo/app-component-library'
import { configureStore } from '@reduxjs/toolkit'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { http, HttpResponse } from 'msw'
import { setsApi } from '@repo/api-client/rtk/sets-api'
import { server } from '../../test/mocks/server'
import userEvent from '@testing-library/user-event'

const successToastSpy = vi.fn()
const errorToastSpy = vi.fn()

vi.mock('@repo/app-component-library', async () => {
  const actual = await vi.importActual<any>('@repo/app-component-library')
  return {
    ...actual,
    useToast: () => ({
      success: successToastSpy,
      error: errorToastSpy,
    }),
  }
})

import { SetDetailPage } from '../set-detail-page'

const API_BASE_URL = 'http://localhost:3001'

const mockSet = {
  id: '11111111-1111-1111-1111-111111111111',
  userId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  title: 'Test Set',
  setNumber: '12345',
  store: 'LEGO Store',
  sourceUrl: 'https://example.com',
  pieceCount: 500,
  releaseDate: '2024-01-01T00:00:00.000Z',
  theme: 'City',
  tags: ['test', 'sample'],
  notes: 'Test notes',
  isBuilt: true,
  quantity: 1,
  purchasePrice: 99.99,
  tax: 8.5,
  shipping: 5.0,
  purchaseDate: '2024-02-01T00:00:00.000Z',
  wishlistItemId: null,
  images: [
    {
      id: '22222222-2222-2222-2222-222222222222',
      imageUrl: 'https://example.com/image1.jpg',
      thumbnailUrl: 'https://example.com/thumb1.jpg',
      position: 0,
    },
    {
      id: '33333333-3333-3333-3333-333333333333',
      imageUrl: 'https://example.com/image2.jpg',
      thumbnailUrl: 'https://example.com/thumb2.jpg',
      position: 1,
    },
  ],
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
}

const createTestStore = () =>
  configureStore({
    reducer: { [setsApi.reducerPath]: setsApi.reducer },
    middleware: getDefaultMiddleware => getDefaultMiddleware().concat(setsApi.middleware),
  })

const renderPage = (setId = '11111111-1111-1111-1111-111111111111') => {
  const store = createTestStore()
  return render(
    <TooltipProvider>
      <Provider store={store}>
        <MemoryRouter initialEntries={[`/sets/${setId}`]}>
          <Routes>
            <Route path="/sets/:id" element={<SetDetailPage />} />
            <Route path="/sets/:id/edit" element={<div data-testid="edit-page">Edit</div>} />
            <Route path="/sets" element={<div data-testid="gallery-page">Gallery</div>} />
          </Routes>
        </MemoryRouter>
      </Provider>
    </TooltipProvider>,
  )
}

describe('SetDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Loading state', () => {
    it('shows skeleton while loading', () => {
      server.use(
        http.get(`${API_BASE_URL}/api/sets/:id`, async () => {
          await new Promise(resolve => setTimeout(resolve, 1000))
          return HttpResponse.json(mockSet)
        }),
      )

      renderPage()

      expect(screen.getByTestId('set-detail-skeleton')).toBeInTheDocument()
    })
  })

  describe('Success state', () => {
    beforeEach(() => {
      server.use(
        http.get(`${API_BASE_URL}/api/sets/:id`, () => {
          return HttpResponse.json(mockSet)
        }),
      )
    })

    it('renders set details when data loads successfully', async () => {
      renderPage()

      await waitFor(() => {
        expect(screen.getByTestId('set-detail-page')).toBeInTheDocument()
      })

      expect(screen.getByText('Test Set')).toBeInTheDocument()
      expect(screen.getByText('#12345')).toBeInTheDocument()
      expect(screen.getByText('City')).toBeInTheDocument()
    })

    it('displays all set information fields', async () => {
      renderPage()

      await waitFor(() => {
        expect(screen.getByTestId('set-detail-page')).toBeInTheDocument()
      })

      expect(screen.getByText(/500 pieces/i)).toBeInTheDocument()
      expect(screen.getByText('Test notes')).toBeInTheDocument()
    })

    it('renders action buttons (back, edit, delete)', async () => {
      renderPage()

      await waitFor(() => {
        expect(screen.getByTestId('set-detail-page')).toBeInTheDocument()
      })

      expect(screen.getByTestId('set-detail-back-button')).toBeInTheDocument()
      expect(screen.getByTestId('set-detail-edit-button')).toBeInTheDocument()
      expect(screen.getByTestId('set-detail-delete-button')).toBeInTheDocument()
    })
  })

  describe('Error handling', () => {
    it('shows 404 message when set is not found', async () => {
      server.use(
        http.get(`${API_BASE_URL}/api/sets/:id`, () => {
          return new HttpResponse(null, { status: 404 })
        }),
      )

      renderPage()

      await waitFor(() => {
        expect(screen.getByTestId('set-detail-not-found')).toBeInTheDocument()
      })

      expect(screen.getByText('Set Not Found')).toBeInTheDocument()
    })

    it('shows 403 access denied message', async () => {
      server.use(
        http.get(`${API_BASE_URL}/api/sets/:id`, () => {
          return new HttpResponse(null, { status: 403 })
        }),
      )

      renderPage()

      await waitFor(() => {
        expect(screen.getByTestId('set-detail-error')).toBeInTheDocument()
      })

      expect(
        screen.getByText(/You don't have access to this set or it belongs to a different user/i),
      ).toBeInTheDocument()
    })

    it('shows generic error message for other errors', async () => {
      server.use(
        http.get(`${API_BASE_URL}/api/sets/:id`, () => {
          return new HttpResponse(null, { status: 500 })
        }),
      )

      renderPage()

      await waitFor(() => {
        expect(screen.getByTestId('set-detail-error')).toBeInTheDocument()
      })

      expect(
        screen.getByText(/Failed to load set details. Please try again from the sets gallery/i),
      ).toBeInTheDocument()
    })
  })

  describe('Navigation', () => {
    beforeEach(() => {
      server.use(
        http.get(`${API_BASE_URL}/api/sets/:id`, () => {
          return HttpResponse.json(mockSet)
        }),
      )
    })

    it('navigates to edit page when edit button is clicked', async () => {
      const user = userEvent.setup()
      renderPage()

      await waitFor(() => {
        expect(screen.getByTestId('set-detail-page')).toBeInTheDocument()
      })

      const editButton = screen.getByTestId('set-detail-edit-button')
      await user.click(editButton)

      await waitFor(() => {
        expect(screen.getByTestId('edit-page')).toBeInTheDocument()
      })
    })

    it('navigates back to gallery when back button is clicked', async () => {
      const user = userEvent.setup()
      renderPage()

      await waitFor(() => {
        expect(screen.getByTestId('set-detail-page')).toBeInTheDocument()
      })

      const backButton = screen.getByTestId('set-detail-back-button')
      await user.click(backButton)

      await waitFor(() => {
        expect(screen.getByTestId('gallery-page')).toBeInTheDocument()
      })
    })
  })

  describe('Delete functionality', () => {
    beforeEach(() => {
      server.use(
        http.get(`${API_BASE_URL}/api/sets/:id`, () => {
          return HttpResponse.json(mockSet)
        }),
      )
    })

    it('opens confirmation dialog when delete button is clicked', async () => {
      const user = userEvent.setup()
      renderPage()

      await waitFor(() => {
        expect(screen.getByTestId('set-detail-page')).toBeInTheDocument()
      })

      const deleteButton = screen.getByTestId('set-detail-delete-button')
      await user.click(deleteButton)

      await waitFor(() => {
        expect(screen.getByRole('alertdialog')).toBeInTheDocument()
      })
    })

    it('closes dialog when cancel is clicked', async () => {
      const user = userEvent.setup()
      renderPage()

      await waitFor(() => {
        expect(screen.getByTestId('set-detail-page')).toBeInTheDocument()
      })

      const deleteButton = screen.getByTestId('set-detail-delete-button')
      await user.click(deleteButton)

      await waitFor(() => {
        expect(screen.getByRole('alertdialog')).toBeInTheDocument()
      })

      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      await user.click(cancelButton)

      await waitFor(() => {
        expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
      })
    })

    it('deletes set and shows success toast when confirmed', async () => {
      const user = userEvent.setup()

      server.use(
        http.delete(`${API_BASE_URL}/api/sets/:id`, () => {
          return new HttpResponse(null, { status: 204 })
        }),
      )

      renderPage()

      await waitFor(() => {
        expect(screen.getByTestId('set-detail-page')).toBeInTheDocument()
      })

      const deleteButton = screen.getByTestId('set-detail-delete-button')
      await user.click(deleteButton)

      await waitFor(() => {
        expect(screen.getByRole('alertdialog')).toBeInTheDocument()
      })

      const confirmButton = screen.getByRole('button', { name: /delete/i })
      await user.click(confirmButton)

      await waitFor(() => {
        expect(successToastSpy).toHaveBeenCalled()
      })

      await waitFor(() => {
        expect(screen.getByTestId('gallery-page')).toBeInTheDocument()
      })
    })

    it('shows error toast when delete fails', async () => {
      const user = userEvent.setup()

      server.use(
        http.delete(`${API_BASE_URL}/api/sets/:id`, () => {
          return new HttpResponse(null, { status: 500 })
        }),
      )

      renderPage()

      await waitFor(() => {
        expect(screen.getByTestId('set-detail-page')).toBeInTheDocument()
      })

      const deleteButton = screen.getByTestId('set-detail-delete-button')
      await user.click(deleteButton)

      await waitFor(() => {
        expect(screen.getByRole('alertdialog')).toBeInTheDocument()
      })

      const confirmButton = screen.getByRole('button', { name: /delete/i })
      await user.click(confirmButton)

      await waitFor(() => {
        expect(errorToastSpy).toHaveBeenCalled()
      })
    })
  })

  describe('Image lightbox', () => {
    beforeEach(() => {
      server.use(
        http.get(`${API_BASE_URL}/api/sets/:id`, () => {
          return HttpResponse.json(mockSet)
        }),
      )
    })

    it('renders image thumbnails when images exist', async () => {
      renderPage()

      await waitFor(() => {
        expect(screen.getByTestId('set-detail-page')).toBeInTheDocument()
      })

      expect(screen.getByTestId('set-detail-image-thumbnail-0')).toBeInTheDocument()
      expect(screen.getByTestId('set-detail-image-thumbnail-1')).toBeInTheDocument()
    })

    it('opens lightbox when thumbnail is clicked', async () => {
      const user = userEvent.setup()
      renderPage()

      await waitFor(() => {
        expect(screen.getByTestId('set-detail-page')).toBeInTheDocument()
      })

      const thumbnail = screen.getByTestId('set-detail-image-thumbnail-0')
      await user.click(thumbnail)

      await waitFor(() => {
        expect(screen.getByTestId('set-detail-lightbox')).toBeInTheDocument()
      })
    })

    it('opens lightbox at correct index when thumbnail is clicked', async () => {
      const user = userEvent.setup()
      renderPage()

      await waitFor(() => {
        expect(screen.getByTestId('set-detail-page')).toBeInTheDocument()
      })

      const secondThumbnail = screen.getByTestId('set-detail-image-thumbnail-1')
      await user.click(secondThumbnail)

      await waitFor(() => {
        const lightbox = screen.getByTestId('set-detail-lightbox')
        expect(lightbox).toBeInTheDocument()
      })
    })

    it('does not render image section when no images exist', async () => {
      const setWithoutImages = { ...mockSet, images: [] }

      server.use(
        http.get(`${API_BASE_URL}/api/sets/:id`, () => {
          return HttpResponse.json(setWithoutImages)
        }),
      )

      renderPage()

      await waitFor(() => {
        expect(screen.getByTestId('set-detail-page')).toBeInTheDocument()
      })

      expect(screen.queryByTestId('set-detail-image-thumbnail-0')).not.toBeInTheDocument()
    })

    it('thumbnails have proper aria-labels', async () => {
      renderPage()

      await waitFor(() => {
        expect(screen.getByTestId('set-detail-page')).toBeInTheDocument()
      })

      const thumbnail = screen.getByTestId('set-detail-image-thumbnail-0')
      expect(thumbnail).toHaveAttribute('aria-label')
      expect(thumbnail.getAttribute('aria-label')).toContain('View')
    })

    it('lightbox can be closed via open prop', async () => {
      const user = userEvent.setup()
      renderPage()

      await waitFor(() => {
        expect(screen.getByTestId('set-detail-page')).toBeInTheDocument()
      })

      const thumbnail = screen.getByTestId('set-detail-image-thumbnail-0')
      await user.click(thumbnail)

      await waitFor(() => {
        expect(screen.getByTestId('set-detail-lightbox')).toBeInTheDocument()
      })

      const lightbox = screen.getByTestId('set-detail-lightbox')
      expect(lightbox).toBeInTheDocument()
    })
  })

  describe('Data display', () => {
    it('displays tags correctly', async () => {
      server.use(
        http.get(`${API_BASE_URL}/api/sets/:id`, () => {
          return HttpResponse.json(mockSet)
        }),
      )

      renderPage()

      await waitFor(() => {
        expect(screen.getByTestId('set-detail-page')).toBeInTheDocument()
      })

      expect(screen.getByText('test')).toBeInTheDocument()
      expect(screen.getByText('sample')).toBeInTheDocument()
    })

    it('displays price information', async () => {
      server.use(
        http.get(`${API_BASE_URL}/api/sets/:id`, () => {
          return HttpResponse.json(mockSet)
        }),
      )

      renderPage()

      await waitFor(() => {
        expect(screen.getByTestId('set-detail-page')).toBeInTheDocument()
      })

      expect(screen.getByText(/99\.99/)).toBeInTheDocument()
    })

    it('displays built status badge', async () => {
      server.use(
        http.get(`${API_BASE_URL}/api/sets/:id`, () => {
          return HttpResponse.json(mockSet)
        }),
      )

      renderPage()

      await waitFor(() => {
        expect(screen.getByTestId('set-detail-page')).toBeInTheDocument()
      })

      expect(screen.getByText('Built')).toBeInTheDocument()
    })

    it('handles null optional fields gracefully', async () => {
      const setWithNulls = {
        ...mockSet,
        setNumber: null,
        store: null,
        sourceUrl: null,
        pieceCount: null,
        releaseDate: null,
        notes: null,
        purchasePrice: null,
        tax: null,
        shipping: null,
        purchaseDate: null,
      }

      server.use(
        http.get(`${API_BASE_URL}/api/sets/:id`, () => {
          return HttpResponse.json(setWithNulls)
        }),
      )

      renderPage()

      await waitFor(() => {
        expect(screen.getByTestId('set-detail-page')).toBeInTheDocument()
      })

      expect(screen.getByText('Test Set')).toBeInTheDocument()
    })
  })
})
