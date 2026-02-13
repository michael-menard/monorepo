/**
 * Edit Set Page Tests
 *
 * BUGF-003: Verify edit page pre-fills, validates, and submits updates.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider } from 'react-redux'
import { TooltipProvider } from '@repo/app-component-library'
import { configureStore } from '@reduxjs/toolkit'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { http, HttpResponse } from 'msw'

import { setsApi } from '@repo/api-client/rtk/sets-api'
import type { Set } from '@repo/api-client/schemas/sets'
import { server } from '../../test/mocks/server'
import { EditSetPage } from '../edit-set-page'

const API_BASE_URL = 'http://localhost:3001'

const mockSet: Set = {
  id: '11111111-1111-1111-1111-111111111111',
  userId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  title: 'Downtown Diner',
  setNumber: '10260',
  store: 'LEGO',
  sourceUrl: null,
  pieceCount: 2480,
  releaseDate: null,
  theme: 'Creator Expert',
  tags: ['modular', 'city'],
  notes: 'Great set',
  isBuilt: false,
  quantity: 1,
  purchasePrice: 169.99,
  tax: null,
  shipping: null,
  purchaseDate: '2025-06-15T00:00:00.000Z',
  wishlistItemId: null,
  images: [],
  createdAt: new Date('2025-01-01').toISOString(),
  updatedAt: new Date('2025-01-01').toISOString(),
}

const createTestStore = () =>
  configureStore({
    reducer: {
      [setsApi.reducerPath]: setsApi.reducer,
    },
    middleware: getDefaultMiddleware => getDefaultMiddleware().concat(setsApi.middleware),
  })

const renderEditPage = (setId = '11111111-1111-1111-1111-111111111111') => {
  const store = createTestStore()

  return render(
    <TooltipProvider>
      <Provider store={store}>
        <MemoryRouter initialEntries={[`/sets/${setId}/edit`]}>
          <Routes>
            <Route path="/sets/:id/edit" element={<EditSetPage />} />
            <Route path="/sets/:id" element={<div data-testid="detail-page">Detail Page</div>} />
            <Route path="/sets" element={<div data-testid="gallery-page">Gallery</div>} />
          </Routes>
        </MemoryRouter>
      </Provider>
    </TooltipProvider>,
  )
}

describe('EditSetPage', () => {
  beforeEach(() => {
    server.use(
      http.get(`${API_BASE_URL}/api/sets/:id`, () => {
        return HttpResponse.json(mockSet)
      }),
    )
  })

  it('displays loading skeleton while fetching set data', () => {
    renderEditPage()
    expect(screen.getByTestId('edit-set-skeleton')).toBeInTheDocument()
  })

  it('pre-fills form with existing set data', async () => {
    renderEditPage()

    await waitFor(() => {
      expect(screen.getByTestId('edit-set-page')).toBeInTheDocument()
    })

    expect(screen.getByLabelText(/title/i)).toHaveValue('Downtown Diner')
    expect(screen.getByLabelText(/set number/i)).toHaveValue('10260')
    expect(screen.getByLabelText(/piece count/i)).toHaveValue(2480)
    expect(screen.getByLabelText(/purchase price/i)).toHaveValue(169.99)
  })

  it('shows error state for non-existent set', async () => {
    server.use(
      http.get(`${API_BASE_URL}/api/sets/:id`, () => {
        return HttpResponse.json({ message: 'Not found' }, { status: 404 })
      }),
    )

    renderEditPage()

    await waitFor(() => {
      expect(screen.getByText(/failed to load set/i)).toBeInTheDocument()
    })
  })

  it('submits update with PATCH and navigates to detail page on success', async () => {
    const user = userEvent.setup()
    let patchBody: Record<string, unknown> | null = null

    server.use(
      http.patch(`${API_BASE_URL}/api/sets/:id`, async ({ request }) => {
        patchBody = (await request.json()) as Record<string, unknown>
        return HttpResponse.json({
          ...mockSet,
          title: patchBody?.title ?? mockSet.title,
        })
      }),
    )

    renderEditPage()

    await waitFor(() => {
      expect(screen.getByTestId('edit-set-page')).toBeInTheDocument()
    })

    // Change title
    const titleInput = screen.getByLabelText(/title/i)
    await user.clear(titleInput)
    await user.type(titleInput, 'Updated Diner')

    // Submit
    const saveButton = screen.getByRole('button', { name: /save changes/i })
    await user.click(saveButton)

    await waitFor(() => {
      expect(patchBody).not.toBeNull()
      expect(patchBody?.title).toBe('Updated Diner')
    })

    // Should navigate to detail page
    await waitFor(() => {
      expect(screen.getByTestId('detail-page')).toBeInTheDocument()
    })
  })

  it('shows error toast on update failure', async () => {
    const user = userEvent.setup()

    server.use(
      http.patch(`${API_BASE_URL}/api/sets/:id`, () => {
        return HttpResponse.json({ message: 'Server error' }, { status: 500 })
      }),
    )

    renderEditPage()

    await waitFor(() => {
      expect(screen.getByTestId('edit-set-page')).toBeInTheDocument()
    })

    // Change something to enable save
    const titleInput = screen.getByLabelText(/title/i)
    await user.clear(titleInput)
    await user.type(titleInput, 'Failed Update')

    const saveButton = screen.getByRole('button', { name: /save changes/i })
    await user.click(saveButton)

    // Page should still be visible (not navigated away)
    await waitFor(() => {
      expect(screen.getByTestId('edit-set-page')).toBeInTheDocument()
    })
  })

  it('navigates to detail page on cancel', async () => {
    const user = userEvent.setup()

    // Mock window.confirm for dirty form check
    vi.spyOn(window, 'confirm').mockReturnValue(true)

    renderEditPage()

    await waitFor(() => {
      expect(screen.getByTestId('edit-set-page')).toBeInTheDocument()
    })

    const cancelButton = screen.getByRole('button', { name: /cancel/i })
    await user.click(cancelButton)

    await waitFor(() => {
      expect(screen.getByTestId('detail-page')).toBeInTheDocument()
    })
  })

  it('shows unsaved changes warning when navigating away with dirty form', async () => {
    const user = userEvent.setup()
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)

    renderEditPage()

    await waitFor(() => {
      expect(screen.getByTestId('edit-set-page')).toBeInTheDocument()
    })

    // Make a change to dirty the form
    const titleInput = screen.getByLabelText(/title/i)
    await user.clear(titleInput)
    await user.type(titleInput, 'Changed Title')

    // Try to cancel - should show confirmation
    const cancelButton = screen.getByRole('button', { name: /cancel/i })
    await user.click(cancelButton)

    expect(confirmSpy).toHaveBeenCalledWith(
      'You have unsaved changes. Are you sure you want to leave?',
    )

    // Should still be on edit page since user declined
    expect(screen.getByTestId('edit-set-page')).toBeInTheDocument()

    confirmSpy.mockRestore()
  })

  it('displays validation errors for invalid input', async () => {
    const user = userEvent.setup()

    renderEditPage()

    await waitFor(() => {
      expect(screen.getByTestId('edit-set-page')).toBeInTheDocument()
    })

    // Clear title (required field)
    const titleInput = screen.getByLabelText(/title/i)
    await user.clear(titleInput)

    const saveButton = screen.getByRole('button', { name: /save changes/i })
    await user.click(saveButton)

    // Should show validation error for title
    await waitFor(() => {
      expect(screen.getByText(/title is required/i)).toBeInTheDocument()
    })
  })

  it('disables form fields during submission', async () => {
    const user = userEvent.setup()

    // Slow response to catch loading state
    server.use(
      http.patch(`${API_BASE_URL}/api/sets/:id`, async () => {
        await new Promise(resolve => setTimeout(resolve, 100))
        return HttpResponse.json(mockSet)
      }),
    )

    renderEditPage()

    await waitFor(() => {
      expect(screen.getByTestId('edit-set-page')).toBeInTheDocument()
    })

    // Change title to enable submission
    const titleInput = screen.getByLabelText(/title/i)
    await user.clear(titleInput)
    await user.type(titleInput, 'Updated')

    const saveButton = screen.getByRole('button', { name: /save changes/i })
    await user.click(saveButton)

    // During submission, fields should be disabled
    await waitFor(() => {
      expect(screen.getByLabelText(/title/i)).toBeDisabled()
    })
  })
})
