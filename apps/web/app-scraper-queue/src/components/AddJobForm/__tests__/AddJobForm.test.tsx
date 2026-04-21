import { describe, it, expect } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../../../test/render'
import { UrlJobForm, MocPipelineForm } from '../index'

describe('UrlJobForm', () => {
  it('renders input field and add button', () => {
    renderWithProviders(
      <UrlJobForm scraperType="bricklink-minifig" placeholder="Minifig number or BrickLink URL" />,
    )

    expect(screen.getByPlaceholderText(/minifig number/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /add/i })).toBeInTheDocument()
  })

  it('add button is disabled when input is empty', () => {
    renderWithProviders(
      <UrlJobForm scraperType="bricklink-minifig" placeholder="Minifig number or BrickLink URL" />,
    )

    expect(screen.getByRole('button', { name: /add/i })).toBeDisabled()
  })

  it('add button is enabled when input has text', async () => {
    const user = userEvent.setup()
    renderWithProviders(
      <UrlJobForm scraperType="bricklink-minifig" placeholder="Minifig number or BrickLink URL" />,
    )

    await user.type(screen.getByPlaceholderText(/minifig number/i), 'cas002')

    expect(screen.getByRole('button', { name: /add/i })).toBeEnabled()
  })

  it('clears input after successful submit', async () => {
    const user = userEvent.setup()
    renderWithProviders(
      <UrlJobForm scraperType="bricklink-minifig" placeholder="Minifig number or BrickLink URL" />,
    )

    const input = screen.getByPlaceholderText(/minifig number/i)
    await user.type(input, 'cas002')
    await user.click(screen.getByRole('button', { name: /add/i }))

    await waitFor(() => {
      expect(input).toHaveValue('')
    })
  })

  it('shows wishlist checkbox by default', () => {
    renderWithProviders(
      <UrlJobForm scraperType="bricklink-minifig" placeholder="Minifig number or BrickLink URL" />,
    )

    expect(screen.getByLabelText(/add to wishlist/i)).toBeInTheDocument()
  })

  it('hides wishlist checkbox when showWishlist is false', () => {
    renderWithProviders(
      <UrlJobForm
        scraperType="bricklink-prices"
        placeholder="Minifig number"
        showWishlist={false}
      />,
    )

    expect(screen.queryByLabelText(/add to wishlist/i)).not.toBeInTheDocument()
  })
})

describe('MocPipelineForm', () => {
  it('renders start pipeline button', () => {
    renderWithProviders(<MocPipelineForm />)

    expect(screen.getByRole('button', { name: /start pipeline/i })).toBeInTheDocument()
  })

  it('renders all pipeline option checkboxes', () => {
    renderWithProviders(<MocPipelineForm />)

    expect(screen.getByText('Resume')).toBeInTheDocument()
    expect(screen.getByText('Retry Missing')).toBeInTheDocument()
    expect(screen.getByText('Retry Failed')).toBeInTheDocument()
    expect(screen.getByText('Liked MOCs')).toBeInTheDocument()
    expect(screen.getByText('Force Re-scrape')).toBeInTheDocument()
  })

  it('checkboxes are unchecked by default', () => {
    renderWithProviders(<MocPipelineForm />)

    const checkboxes = screen.getAllByRole('checkbox')
    for (const cb of checkboxes) {
      expect(cb).not.toBeChecked()
    }
  })

  it('can toggle a checkbox', async () => {
    const user = userEvent.setup()
    renderWithProviders(<MocPipelineForm />)

    const checkboxes = screen.getAllByRole('checkbox')
    await user.click(checkboxes[0])

    expect(checkboxes[0]).toBeChecked()
  })
})
