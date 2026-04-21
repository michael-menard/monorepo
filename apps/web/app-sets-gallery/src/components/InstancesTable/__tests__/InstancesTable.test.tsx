import { render, screen, waitFor, within } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Provider } from 'react-redux'
import { TooltipProvider } from '@repo/app-component-library'
import { configureStore } from '@reduxjs/toolkit'
import { MemoryRouter } from 'react-router-dom'
import { http, HttpResponse } from 'msw'
import { setsApi } from '@repo/api-client/rtk/sets-api'
import type { SetInstance } from '@repo/api-client/schemas/sets'
import { server } from '../../../test/mocks/server'
import userEvent from '@testing-library/user-event'

// ---------------------------------------------------------------------------
// Toast spies
// ---------------------------------------------------------------------------

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

import { InstancesTable } from '../index'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const API_BASE_URL = 'http://localhost:3001'
const SET_ID = '11111111-1111-1111-1111-111111111111'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeInstance(overrides: Partial<SetInstance> = {}): SetInstance {
  return {
    id: 'aaaa1111-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    setId: SET_ID,
    condition: 'new',
    completeness: 'complete',
    buildStatus: 'not_started',
    includesMinifigs: true,
    purchasePrice: '49.99',
    purchaseTax: null,
    purchaseShipping: null,
    purchaseDate: '2025-06-01T00:00:00.000Z',
    storeId: null,
    notes: 'First copy',
    sortOrder: null,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    ...overrides,
  }
}

const instance1 = makeInstance()
const instance2 = makeInstance({
  id: 'bbbb2222-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  condition: 'used',
  completeness: 'incomplete',
  buildStatus: 'completed',
  includesMinifigs: false,
  purchasePrice: '29.99',
  purchaseDate: '2025-03-15T00:00:00.000Z',
  notes: 'Second copy',
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const createTestStore = () =>
  configureStore({
    reducer: { [setsApi.reducerPath]: setsApi.reducer },
    middleware: getDefaultMiddleware => getDefaultMiddleware().concat(setsApi.middleware),
  })

function renderTable(instances: SetInstance[] = []) {
  const store = createTestStore()
  return render(
    <TooltipProvider>
      <Provider store={store}>
        <MemoryRouter>
          <InstancesTable setId={SET_ID} instances={instances} />
        </MemoryRouter>
      </Provider>
    </TooltipProvider>,
  )
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('InstancesTable', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Empty state', () => {
    it('renders empty skeleton row when instances array is empty', () => {
      renderTable([])

      // The empty state shows a skeleton placeholder row and an "Add your first copy" button
      expect(screen.getByRole('button', { name: /add your first copy/i })).toBeInTheDocument()
    })

    it('renders table headers even when empty', () => {
      renderTable([])

      expect(screen.getByText('Condition')).toBeInTheDocument()
      expect(screen.getByText('Completeness')).toBeInTheDocument()
      expect(screen.getByText('Build Status')).toBeInTheDocument()
      expect(screen.getByText('Minifigs')).toBeInTheDocument()
      expect(screen.getByText('Price')).toBeInTheDocument()
      expect(screen.getByText('Date')).toBeInTheDocument()
      expect(screen.getByText('Notes')).toBeInTheDocument()
    })

    it('"Add your first copy" button calls createInstance mutation', async () => {
      const user = userEvent.setup()

      server.use(
        http.post(`${API_BASE_URL}/api/sets/${SET_ID}/instances`, () => {
          return HttpResponse.json(makeInstance())
        }),
      )

      renderTable([])

      const addButton = screen.getByRole('button', { name: /add your first copy/i })
      await user.click(addButton)

      await waitFor(() => {
        expect(successToastSpy).toHaveBeenCalledWith('Added', 'New copy added to your collection.')
      })
    })
  })

  describe('Populated state', () => {
    it('renders a row for each instance', () => {
      renderTable([instance1, instance2])

      // Row numbers 1 and 2 should be visible
      expect(screen.getByText('1')).toBeInTheDocument()
      expect(screen.getByText('2')).toBeInTheDocument()
    })

    it('displays condition value as badge text for each instance', () => {
      renderTable([instance1, instance2])

      expect(screen.getByText('New')).toBeInTheDocument()
      expect(screen.getByText('Used')).toBeInTheDocument()
    })

    it('displays completeness value for each instance', () => {
      renderTable([instance1, instance2])

      expect(screen.getByText('Complete')).toBeInTheDocument()
      expect(screen.getByText('Incomplete')).toBeInTheDocument()
    })

    it('displays build status value for each instance', () => {
      renderTable([instance1, instance2])

      expect(screen.getByText('Not Started')).toBeInTheDocument()
      expect(screen.getByText('Completed')).toBeInTheDocument()
    })

    it('displays minifigs toggle for each instance', () => {
      renderTable([instance1, instance2])

      // instance1 has includesMinifigs: true, instance2 has false
      expect(screen.getByText('Yes')).toBeInTheDocument()
      expect(screen.getByText('No')).toBeInTheDocument()
    })

    it('displays purchase price formatted as currency', () => {
      renderTable([instance1])

      expect(screen.getByText('$49.99')).toBeInTheDocument()
    })

    it('displays notes for each instance', () => {
      renderTable([instance1, instance2])

      expect(screen.getByText('First copy')).toBeInTheDocument()
      expect(screen.getByText('Second copy')).toBeInTheDocument()
    })

    it('"Add Copy" button is present when instances exist', () => {
      renderTable([instance1])

      expect(screen.getByRole('button', { name: /add copy/i })).toBeInTheDocument()
    })

    it('"Add Copy" button calls createInstance mutation', async () => {
      const user = userEvent.setup()

      server.use(
        http.post(`${API_BASE_URL}/api/sets/${SET_ID}/instances`, () => {
          return HttpResponse.json(makeInstance({ id: 'cccc3333-cccc-cccc-cccc-cccccccccccc' }))
        }),
      )

      renderTable([instance1])

      const addButton = screen.getByRole('button', { name: /add copy/i })
      await user.click(addButton)

      await waitFor(() => {
        expect(successToastSpy).toHaveBeenCalledWith('Added', 'New copy added to your collection.')
      })
    })
  })

  describe('Delete functionality', () => {
    it('renders a delete button for each instance row', () => {
      renderTable([instance1])

      expect(screen.getByRole('button', { name: /delete copy/i })).toBeInTheDocument()
    })

    it('shows confirmation dialog when delete button is clicked', async () => {
      const user = userEvent.setup()
      renderTable([instance1])

      const deleteButton = screen.getByRole('button', { name: /delete copy/i })
      await user.click(deleteButton)

      await waitFor(() => {
        expect(screen.getByRole('alertdialog')).toBeInTheDocument()
      })

      expect(screen.getByText(/delete this copy/i)).toBeInTheDocument()
      expect(screen.getByText(/are you sure you want to remove this copy/i)).toBeInTheDocument()
    })

    it('closes confirmation dialog when cancel is clicked', async () => {
      const user = userEvent.setup()
      renderTable([instance1])

      const deleteButton = screen.getByRole('button', { name: /delete copy/i })
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

    it('deletes instance and shows success toast when confirmed', async () => {
      const user = userEvent.setup()

      server.use(
        http.delete(
          `${API_BASE_URL}/api/sets/${SET_ID}/instances/${instance1.id}`,
          () => {
            return new HttpResponse(null, { status: 204 })
          },
        ),
      )

      renderTable([instance1])

      const deleteButton = screen.getByRole('button', { name: /delete copy/i })
      await user.click(deleteButton)

      await waitFor(() => {
        expect(screen.getByRole('alertdialog')).toBeInTheDocument()
      })

      const confirmButton = screen.getByRole('button', { name: /delete/i })
      await user.click(confirmButton)

      await waitFor(() => {
        expect(successToastSpy).toHaveBeenCalledWith(
          'Deleted',
          'Copy removed from collection.',
        )
      })
    })

    it('shows error toast when delete fails', async () => {
      const user = userEvent.setup()

      server.use(
        http.delete(
          `${API_BASE_URL}/api/sets/${SET_ID}/instances/${instance1.id}`,
          () => {
            return new HttpResponse(null, { status: 500 })
          },
        ),
      )

      renderTable([instance1])

      const deleteButton = screen.getByRole('button', { name: /delete copy/i })
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

  describe('Multiple instance rows', () => {
    it('renders delete buttons for each row', () => {
      renderTable([instance1, instance2])

      const deleteButtons = screen.getAllByRole('button', { name: /delete copy/i })
      expect(deleteButtons).toHaveLength(2)
    })
  })
})
