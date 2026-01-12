import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ColumnFilterInput } from '..'

vi.mock('@repo/app-component-library', () => {
  const Button = (props: any) => <button {...props} />
  const Input = (props: any) => <input {...props} />
  const Select = (props: any) => <select {...props} />
  const SelectContent = (props: any) => <div {...props} />
  const SelectItem = (props: any) => <div {...props} />
  const SelectTrigger = (props: any) => <button {...props} />
  const SelectValue = (props: any) => <span {...props} />
  const Popover = (props: any) => <div {...props} />
  const PopoverContent = (props: any) => <div {...props} />
  const PopoverTrigger = (props: any) => <div {...props} />

  return {
    Button,
    Input,
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
    Popover,
    PopoverContent,
    PopoverTrigger,
  }
})
import type { ColumnFilter } from '../../../__types__/columnFilter'

interface Item {
  id: number
  title: string
}

describe('ColumnFilterInput', () => {
  it('renders filter button with aria-label', () => {
    const onChange = vi.fn()

    render(
      <ColumnFilterInput<Item>
        field="title"
        label="Title"
        type="text"
        operators={['equals', 'contains']}
        onChange={onChange}
      />,
    )

    expect(screen.getByRole('button', { name: /filter title/i })).toBeInTheDocument()
  })

  it('opens popover and applies filter', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn<(filter: ColumnFilter<Item> | null) => void>()

    render(
      <ColumnFilterInput<Item>
        field="title"
        label="Title"
        type="text"
        operators={['equals', 'contains']}
        onChange={onChange}
      />,
    )

    await user.click(screen.getByRole('button', { name: /filter title/i }))

    const input = screen.getByPlaceholderText(/enter title/i)
    await user.type(input, 'Alpha')

    await user.click(screen.getByRole('button', { name: /apply/i }))

    expect(onChange).toHaveBeenCalled()
  })
})
