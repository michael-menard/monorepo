import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TagInput } from '../TagInput'

describe('TagInput', () => {
  it('renders with placeholder text', () => {
    const onChange = vi.fn()
    render(<TagInput value={[]} onChange={onChange} placeholder="Add tags..." />)
    expect(screen.getByPlaceholderText('Add tags...')).toBeInTheDocument()
  })

  it('displays existing tags', () => {
    const onChange = vi.fn()
    render(<TagInput value={['castle', 'medieval']} onChange={onChange} />)
    expect(screen.getByText('castle')).toBeInTheDocument()
    expect(screen.getByText('medieval')).toBeInTheDocument()
  })

  it('adds a tag when Enter is pressed', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<TagInput value={[]} onChange={onChange} />)

    const input = screen.getByRole('textbox')
    await user.type(input, 'new-tag{Enter}')

    expect(onChange).toHaveBeenCalledWith(['new-tag'])
  })

  it('trims whitespace from tags', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<TagInput value={[]} onChange={onChange} />)

    const input = screen.getByRole('textbox')
    await user.type(input, '  spaced-tag  {Enter}')

    expect(onChange).toHaveBeenCalledWith(['spaced-tag'])
  })

  it('does not add empty tags', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<TagInput value={[]} onChange={onChange} />)

    const input = screen.getByRole('textbox')
    await user.type(input, '   {Enter}')

    expect(onChange).not.toHaveBeenCalled()
  })

  it('does not add duplicate tags', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<TagInput value={['existing']} onChange={onChange} />)

    const input = screen.getByRole('textbox')
    await user.type(input, 'existing{Enter}')

    expect(onChange).not.toHaveBeenCalled()
  })

  it('removes a tag when X button is clicked', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<TagInput value={['tag1', 'tag2']} onChange={onChange} />)

    const removeButtons = screen.getAllByRole('button')
    await user.click(removeButtons[0])

    expect(onChange).toHaveBeenCalledWith(['tag2'])
  })

  it('respects maxTags limit', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<TagInput value={['tag1', 'tag2']} onChange={onChange} maxTags={2} />)

    const input = screen.getByRole('textbox')
    await user.type(input, 'tag3{Enter}')

    expect(onChange).not.toHaveBeenCalled()
  })

  it('respects maxTagLength limit', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<TagInput value={[]} onChange={onChange} maxTagLength={5} />)

    const input = screen.getByRole('textbox')
    await user.type(input, 'toolong{Enter}')

    expect(onChange).not.toHaveBeenCalled()
  })

  it('removes last tag when Backspace is pressed on empty input', () => {
    const onChange = vi.fn()
    render(<TagInput value={['tag1', 'tag2']} onChange={onChange} />)

    const input = screen.getByRole('textbox')
    fireEvent.keyDown(input, { key: 'Backspace' })

    expect(onChange).toHaveBeenCalledWith(['tag1'])
  })

  it('is disabled when disabled prop is true', () => {
    const onChange = vi.fn()
    render(<TagInput value={[]} onChange={onChange} disabled />)

    const input = screen.getByRole('textbox')
    expect(input).toBeDisabled()
  })

  it('does not allow removing tags when disabled', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<TagInput value={['tag1']} onChange={onChange} disabled />)

    const removeButton = screen.getByRole('button')
    await user.click(removeButton)

    expect(onChange).not.toHaveBeenCalled()
  })
})

