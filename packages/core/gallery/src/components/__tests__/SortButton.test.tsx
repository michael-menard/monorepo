import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SortProvider } from '../../contexts/SortContext'
import { SortButton } from '../SortButton'

vi.mock('@repo/app-component-library', () => {
  const Button = (props: any) => <button {...props} />
  const Badge = (props: any) => <span {...props} />
  const Popover = (props: any) => <div {...props} />
  const PopoverContent = (props: any) => <div {...props} />
  const PopoverTrigger = (props: any) => <div {...props} />
  const Select = (props: any) => <select {...props} />
  const SelectContent = (props: any) => <div {...props} />
  const SelectItem = (props: any) => <div {...props} />
  const SelectTrigger = (props: any) => <button {...props} />
  const SelectValue = (props: any) => <span {...props} />

  return {
    Button,
    Badge,
    Popover,
    PopoverContent,
    PopoverTrigger,
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
  }
})

interface Item {
  id: number
  name: string
}

const sortableFields = [{ field: 'name' as keyof Item, label: 'Name' }]

const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <SortProvider<Item>>{children}</SortProvider>
)

describe('SortButton', () => {
  it('renders sort button', () => {
    render(
      <Wrapper>
        <SortButton<Item> sortableFields={sortableFields} />
      </Wrapper>,
    )

    // The trigger button has an aria-label that includes "Sort"
    const trigger = screen.getByRole('button', { name: /sort, no columns active/i })
    expect(trigger).toBeInTheDocument()
  })

  it('opens popover on click (smoke test)', async () => {
    const user = userEvent.setup()

    render(
      <Wrapper>
        <SortButton<Item> sortableFields={sortableFields} />
      </Wrapper>,
    )

    const trigger = screen.getByRole('button', { name: /sort, no columns active/i })
    await user.click(trigger)

    // With mocked components we just assert that the structure renders without error
    expect(trigger).toBeInTheDocument()
  })
})
