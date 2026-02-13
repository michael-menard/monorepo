/**
 * AddSetPage Tests
 *
 * Verifies that the Add Set form wires to the real Sets RTK hooks (mocked)
 * and maps form data into CreateSetInput before calling the mutation.
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'

// Spy for addSet mutation
const addSetMutationSpy = vi.fn((input: any) => ({
  unwrap: async () => ({
    // Minimal Set shape needed by AddSetPage navigation
    id: '11111111-1111-1111-1111-111111111111',
    userId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    title: input.title,
    setNumber: input.setNumber ?? null,
    store: null,
    sourceUrl: null,
    pieceCount: input.pieceCount ?? null,
    releaseDate: null,
    theme: input.theme ?? null,
    tags: input.tags ?? [],
    notes: input.notes ?? null,
    isBuilt: input.isBuilt ?? false,
    quantity: input.quantity ?? 1,
    purchasePrice: input.purchasePrice ?? null,
    tax: input.tax ?? null,
    shipping: input.shipping ?? null,
    purchaseDate: input.purchaseDate ?? null,
    wishlistItemId: null,
    images: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }),
}))

const presignSpy = vi.fn()
const registerSpy = vi.fn()

vi.mock('@repo/api-client/rtk/sets-api', () => ({
  useAddSetMutation: () => [addSetMutationSpy],
  usePresignSetImageMutation: () => [presignSpy],
  useRegisterSetImageMutation: () => [registerSpy],
}))

// Provide a noop useToast implementation to avoid requiring a provider
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

import { AddSetPage } from '../add-set-page'

const renderAddSetPage = () => {
  return render(
    <MemoryRouter initialEntries={['/sets/add']}>
      <Routes>
        <Route path="/sets/add" element={<AddSetPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('AddSetPage', () => {
  beforeEach(() => {
    addSetMutationSpy.mockClear()
    presignSpy.mockReset()
    registerSpy.mockReset()
    successToastSpy.mockClear()
    errorToastSpy.mockClear()
  })

  it('submits minimal valid form and calls addSet mutation with mapped data', async () => {
    const user = userEvent.setup()
    renderAddSetPage()

    // Only title is required by CreateSetSchema
    const titleInput = screen.getByLabelText(/title/i)
    await user.type(titleInput, 'My Test Set')

    const submitButton = screen.getByRole('button', { name: /add set/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(addSetMutationSpy).toHaveBeenCalledTimes(1)
    })

    const [calledInput] = addSetMutationSpy.mock.calls[0]
    expect(calledInput.title).toBe('My Test Set')
  })

  it('shows validation errors when CreateSetSchema rejects', async () => {
    const user = userEvent.setup()
    renderAddSetPage()

    const submitButton = screen.getByRole('button', { name: /add set/i })
    await user.click(submitButton)

    await waitFor(() => {
      // Title is required
      expect(screen.getByText(/title is required/i)).toBeInTheDocument()
    })

    expect(addSetMutationSpy).not.toHaveBeenCalled()
  })

  it('maps optional fields into numeric/date types before calling addSet', async () => {
    const user = userEvent.setup()
    renderAddSetPage()

    await user.type(screen.getByLabelText(/title/i), 'Full UI Set')
    await user.type(screen.getByLabelText(/set number/i), '12345')
    await user.type(screen.getByLabelText(/piece count/i), '1000')
    await user.type(screen.getByLabelText(/purchase price/i), '19.99')

    const purchaseDateInput = screen.getByLabelText(/purchase date/i)
    await user.type(purchaseDateInput, '2025-01-02')

    const submitButton = screen.getByRole('button', { name: /add set/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(addSetMutationSpy).toHaveBeenCalledTimes(1)
    })

    const [calledInput] = addSetMutationSpy.mock.calls[0]
    expect(calledInput.title).toBe('Full UI Set')
    expect(calledInput.setNumber).toBe('12345')
    expect(calledInput.pieceCount).toBe(1000)
    expect(calledInput.purchasePrice).toBe(19.99)
    expect(new Date(calledInput.purchaseDate).toISOString()).toContain('2025-01-02')
  })

  it('invokes image upload flow when images are present', async () => {
    const user = userEvent.setup()

    // Mock presign/register mutations to behave like RTK Query hooks
    presignSpy.mockReturnValue({
      unwrap: async () => ({
        uploadUrl: 'https://example.com/upload',
        imageUrl: 'https://example.com/image.jpg',
        key: 'sets/key',
      }),
    })
    registerSpy.mockReturnValue({ unwrap: async () => ({}) })

    // Mock uploadToPresignedUrl implementation
    const uploadModule = await import('@repo/upload')
    const uploadMock = vi.spyOn(uploadModule, 'uploadToPresignedUrl').mockResolvedValue({
      success: true,
      httpStatus: 200,
    })

    renderAddSetPage()

    await user.type(screen.getByLabelText(/title/i), 'With Image')

    const fileInput = screen.getByLabelText(/drag and drop images here, or click to select/i, {
      selector: 'input[type="file"]',
    }) as HTMLInputElement

    const file = new File(['file-1'], 'file1.jpg', { type: 'image/jpeg' })
    await user.upload(fileInput, file)

    const submitButton = screen.getByRole('button', { name: /add set/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(addSetMutationSpy).toHaveBeenCalledTimes(1)
    })

    expect(presignSpy).toHaveBeenCalled()
    expect(uploadMock).toHaveBeenCalled()
    expect(registerSpy).toHaveBeenCalled()
  })

  it('shows an error toast when addSet mutation throws', async () => {
    const user = userEvent.setup()

    addSetMutationSpy.mockReturnValueOnce({
      unwrap: async () => {
        throw new Error('API failure')
      },
    })

    renderAddSetPage()

    await user.type(screen.getByLabelText(/title/i), 'Error Set')

    const submitButton = screen.getByRole('button', { name: /add set/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(errorToastSpy).toHaveBeenCalled()
    })
  })
})
