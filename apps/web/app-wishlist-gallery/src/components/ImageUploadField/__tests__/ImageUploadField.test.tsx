import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ImageUploadField } from '../index'

describe('ImageUploadField', () => {
  it('renders empty state and triggers onFileChange when a file is selected', () => {
    const handleFileChange = vi.fn()

    const { container } = render(
      <ImageUploadField file={null} preview={null} onFileChange={handleFileChange} onRemove={vi.fn()} />,
    )

    // Empty state text
    expect(screen.getByText('Click to upload image')).toBeInTheDocument()

    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    expect(input).toBeTruthy()

    const file = new File(['dummy'], 'image.png', { type: 'image/png' })
    fireEvent.change(input, { target: { files: [file] } })

    expect(handleFileChange).toHaveBeenCalledTimes(1)
    expect(handleFileChange).toHaveBeenCalledWith(file)
  })

  it('renders preview state and calls onRemove when remove button is clicked', () => {
    const handleRemove = vi.fn()

    render(
      <ImageUploadField
        file={new File(['dummy'], 'image.png', { type: 'image/png' })}
        preview="blob:preview-url"
        onFileChange={vi.fn()}
        onRemove={handleRemove}
      />,
    )

    // Preview image should be rendered
    const img = screen.getByAltText('Preview') as HTMLImageElement
    expect(img).toBeInTheDocument()

    const removeButton = screen.getByRole('button', { name: /remove image/i })
    fireEvent.click(removeButton)

    expect(handleRemove).toHaveBeenCalledTimes(1)
  })
})
