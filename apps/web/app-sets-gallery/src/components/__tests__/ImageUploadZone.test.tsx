/**
 * ImageUploadZone Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { ImageUploadZone } from '../ImageUploadZone'

// Stub URL.createObjectURL to avoid issues in jsdom
beforeEach(() => {
  vi.spyOn(URL, 'createObjectURL').mockImplementation(() => 'blob:mock-url')
})

describe('ImageUploadZone', () => {
  it('renders current image count and max', () => {
    render(
      <ImageUploadZone images={[]} onImagesChange={vi.fn()} maxImages={10} disabled={false} />,
    )

    expect(screen.getByText('0/10 images')).toBeInTheDocument()
  })

  it('adds selected image files via file input and enforces maxImages', async () => {
    const user = userEvent.setup()
    const handleChange = vi.fn()

    render(
      <ImageUploadZone images={[]} onImagesChange={handleChange} maxImages={1} disabled={false} />,
    )

    const input = screen.getByLabelText(/drag and drop images here, or click to select/i, {
      selector: 'input[type="file"]',
    }) as HTMLInputElement

    const file1 = new File(['file-1'], 'file1.jpg', { type: 'image/jpeg' })
    const file2 = new File(['file-2'], 'file2.jpg', { type: 'image/jpeg' })

    await user.upload(input, [file1, file2])

    // onImagesChange should receive at most 1 file due to maxImages=1
    expect(handleChange).toHaveBeenCalledTimes(1)
    const [arg] = handleChange.mock.calls[0]
    expect(arg).toHaveLength(1)
    expect(arg[0].name).toBe('file1.jpg')
  })

  it('adds dropped image files via drag-and-drop', () => {
    const handleChange = vi.fn()

    render(
      <ImageUploadZone images={[]} onImagesChange={handleChange} maxImages={5} disabled={false} />,
    )

    const dropZone = screen.getByRole('button')

    const file = new File(['file-1'], 'file1.png', { type: 'image/png' })

    fireEvent.dragOver(dropZone, {
      dataTransfer: { files: [file] },
    } as any)

    fireEvent.drop(dropZone, {
      dataTransfer: { files: [file] },
    } as any)

    expect(handleChange).toHaveBeenCalled()
    const [arg] = handleChange.mock.calls[0]
    expect(arg).toHaveLength(1)
    expect(arg[0].name).toBe('file1.png')
  })

  it('removes an image when the remove button is clicked', () => {
    const file1 = new File(['file-1'], 'file1.jpg', { type: 'image/jpeg' })
    const file2 = new File(['file-2'], 'file2.jpg', { type: 'image/jpeg' })
    const handleChange = vi.fn()

    render(
      <ImageUploadZone images={[file1, file2]} onImagesChange={handleChange} maxImages={5} />,
    )

    // Hover to reveal controls and click the first remove button
    const previews = screen.getAllByRole('img')
    expect(previews).toHaveLength(2)

    const removeButtons = screen.getAllByLabelText(/remove image/i)
    fireEvent.click(removeButtons[0])

    expect(handleChange).toHaveBeenCalled()
    const [arg] = handleChange.mock.calls[0]
    // Should have removed index 0, leaving the second file
    expect(arg).toHaveLength(1)
    expect(arg[0].name).toBe('file2.jpg')
  })

  it('moves an image up when the reorder button is clicked', () => {
    const file1 = new File(['file-1'], 'file1.jpg', { type: 'image/jpeg' })
    const file2 = new File(['file-2'], 'file2.jpg', { type: 'image/jpeg' })
    const handleChange = vi.fn()

    render(
      <ImageUploadZone images={[file1, file2]} onImagesChange={handleChange} maxImages={5} />,
    )

    // There will be a remove button for each image and a move button for index > 0
    const buttons = screen.getAllByLabelText(/move image up/i)
    // Last button should be the move-up control for the second image
    const moveButton = buttons[buttons.length - 1]
    fireEvent.click(moveButton)

    expect(handleChange).toHaveBeenCalled()
    const [arg] = handleChange.mock.calls[0]
    expect(arg).toHaveLength(2)
    // Order should now be [file2, file1]
    expect(arg[0].name).toBe('file2.jpg')
    expect(arg[1].name).toBe('file1.jpg')
  })

  it('disables interactions when disabled=true', async () => {
    const user = userEvent.setup()
    const handleChange = vi.fn()

    render(
      <ImageUploadZone images={[]} onImagesChange={handleChange} maxImages={5} disabled />,
    )

    const dropZone = screen.getByRole('button')

    // Click should not open file dialog; we just assert no change handler calls
    await user.click(dropZone)

    expect(handleChange).not.toHaveBeenCalled()
  })
})
