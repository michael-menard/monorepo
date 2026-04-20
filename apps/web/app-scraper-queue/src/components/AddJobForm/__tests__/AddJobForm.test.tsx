import { describe, it, expect } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../../../test/render'
import { AddJobForm } from '../index'

describe('AddJobForm', () => {
  it('renders input field and add button', () => {
    renderWithProviders(<AddJobForm />)

    expect(screen.getByPlaceholderText(/paste url/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /add/i })).toBeInTheDocument()
  })

  it('add button is disabled when input is empty', () => {
    renderWithProviders(<AddJobForm />)

    expect(screen.getByRole('button', { name: /add/i })).toBeDisabled()
  })

  it('add button is enabled when input has text', async () => {
    const user = userEvent.setup()
    renderWithProviders(<AddJobForm />)

    await user.type(screen.getByPlaceholderText(/paste url/i), 'cas002')

    expect(screen.getByRole('button', { name: /add/i })).toBeEnabled()
  })

  it('shows auto-detected type badge for bricklink URL', async () => {
    const user = userEvent.setup()
    renderWithProviders(<AddJobForm />)

    await user.type(
      screen.getByPlaceholderText(/paste url/i),
      'https://www.bricklink.com/v2/catalog/catalogitem.page?M=cas002',
    )

    expect(screen.getByText('BrickLink Minifig')).toBeInTheDocument()
  })

  it('shows auto-detected type badge for catalog URL', async () => {
    const user = userEvent.setup()
    renderWithProviders(<AddJobForm />)

    await user.type(
      screen.getByPlaceholderText(/paste url/i),
      'https://www.bricklink.com/catalogList.asp?catType=S&catString=746.753',
    )

    expect(screen.getByText('BrickLink Catalog')).toBeInTheDocument()
  })

  it('shows auto-detected type badge for LEGO.com URL', async () => {
    const user = userEvent.setup()
    renderWithProviders(<AddJobForm />)

    await user.type(
      screen.getByPlaceholderText(/paste url/i),
      'https://www.lego.com/en-us/product/set-42115',
    )

    expect(screen.getByText('LEGO.com Set')).toBeInTheDocument()
  })

  it('shows auto-detected type badge for bare minifig number', async () => {
    const user = userEvent.setup()
    renderWithProviders(<AddJobForm />)

    await user.type(screen.getByPlaceholderText(/paste url/i), 'cas002')

    expect(screen.getByText('BrickLink Minifig')).toBeInTheDocument()
  })

  it('clears input after successful submit', async () => {
    const user = userEvent.setup()
    renderWithProviders(<AddJobForm />)

    const input = screen.getByPlaceholderText(/paste url/i)
    await user.type(input, 'cas002')
    await user.click(screen.getByRole('button', { name: /add/i }))

    await waitFor(() => {
      expect(input).toHaveValue('')
    })
  })

  it('has a Run MOC Pipeline button', () => {
    renderWithProviders(<AddJobForm />)

    expect(screen.getByRole('button', { name: /run moc pipeline/i })).toBeInTheDocument()
  })

  it('has a wishlist checkbox', () => {
    renderWithProviders(<AddJobForm />)

    expect(screen.getByLabelText(/add to wishlist/i)).toBeInTheDocument()
  })
})
