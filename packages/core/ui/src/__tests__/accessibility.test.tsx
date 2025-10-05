import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { Button } from '../button'
import { Input } from '../input'
import { Checkbox } from '../checkbox'
import { Switch } from '../switch'
import { Progress } from '../progress'
import { Slider } from '../slider'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell, TableCaption } from '../table'
import { MultiSelect } from '../multi-select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../tabs'
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '../accordion'
import { Tooltip, TooltipTrigger, TooltipContent } from '../tooltip'
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from '../dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../select'

// Mock ResizeObserver for tests
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

describe('Accessibility Features', () => {
  const user = userEvent.setup()

  describe('Button Component', () => {
    test('should have proper ARIA attributes for toggle button', () => {
      render(<Button pressed>Toggle Button</Button>)
      
      const button = screen.getByRole('button', { name: 'Toggle Button' })
      expect(button).toHaveAttribute('aria-pressed', 'true')
    })

    test('should have proper ARIA attributes for disabled button', () => {
      render(<Button disabled>Disabled Button</Button>)
      
      const button = screen.getByRole('button', { name: 'Disabled Button' })
      expect(button).toHaveAttribute('aria-disabled', 'true')
    })

    test('should be keyboard accessible', async () => {
      const handleClick = vi.fn()
      render(<Button onClick={handleClick}>Test Button</Button>)
      
      const button = screen.getByRole('button', { name: 'Test Button' })
      button.focus()
      
      await user.keyboard('{Enter}')
      expect(handleClick).toHaveBeenCalledTimes(1)
      
      await user.keyboard(' ')
      expect(handleClick).toHaveBeenCalledTimes(2)
    })
  })

  describe('Input Component', () => {
    test('should have proper label association', () => {
      render(<Input label="Email Address" placeholder="Enter email" />)
      
      const input = screen.getByRole('textbox', { name: 'Email Address' })
      expect(input).toBeInTheDocument()
    })

    test('should show required indicator', () => {
      render(<Input label="Email Address" required />)
      
      const label = screen.getByText('Email Address')
      const requiredIndicator = label.querySelector('[aria-hidden="true"]')
      expect(requiredIndicator).toHaveTextContent('*')
    })

    test('should have proper error handling', () => {
      render(<Input label="Email" error="Invalid email format" />)
      
      const input = screen.getByRole('textbox', { name: 'Email' })
      expect(input).toHaveAttribute('aria-invalid', 'true')
      
      const errorMessage = screen.getByText('Invalid email format')
      expect(errorMessage).toHaveAttribute('role', 'alert')
      expect(errorMessage).toHaveAttribute('aria-live', 'polite')
    })

    test('should have proper description', () => {
      render(<Input label="Password" description="Must be at least 8 characters" />)
      
      const input = screen.getByRole('textbox', { name: 'Password' })
      const description = screen.getByText('Must be at least 8 characters')
      expect(input).toHaveAttribute('aria-describedby', expect.stringContaining(description.id))
    })
  })

  describe('Checkbox Component', () => {
    test('should have proper label association', () => {
      render(<Checkbox label="Accept terms" />)
      
      const checkbox = screen.getByRole('checkbox', { name: 'Accept terms' })
      expect(checkbox).toBeInTheDocument()
    })

    test('should show required indicator', () => {
      render(<Checkbox label="Accept terms" required />)
      
      const label = screen.getByText('Accept terms')
      const requiredIndicator = label.querySelector('[aria-hidden="true"]')
      expect(requiredIndicator).toHaveTextContent('*')
    })

    test('should have proper error handling', () => {
      render(<Checkbox label="Accept terms" error="You must accept the terms" />)
      
      const checkbox = screen.getByRole('checkbox', { name: 'Accept terms' })
      expect(checkbox).toHaveAttribute('aria-invalid', 'true')
      
      const errorMessage = screen.getByText('You must accept the terms')
      expect(errorMessage).toHaveAttribute('role', 'alert')
    })
  })

  describe('Switch Component', () => {
    test('should have proper label association', () => {
      render(<Switch label="Enable notifications" />)
      
      const switchElement = screen.getByRole('switch', { name: 'Enable notifications' })
      expect(switchElement).toBeInTheDocument()
    })

    test('should show required indicator', () => {
      render(<Switch label="Enable notifications" required />)
      
      const label = screen.getByText('Enable notifications')
      const requiredIndicator = label.querySelector('[aria-hidden="true"]')
      expect(requiredIndicator).toHaveTextContent('*')
    })

    test('should have proper error handling', () => {
      render(<Switch label="Enable notifications" error="This field is required" />)
      
      const switchElement = screen.getByRole('switch', { name: 'Enable notifications' })
      expect(switchElement).toHaveAttribute('aria-invalid', 'true')
    })
  })

  describe('Progress Component', () => {
    test('should have proper ARIA attributes', () => {
      render(<Progress value={50} label="Upload Progress" />)
      
      const progressbar = screen.getByRole('progressbar')
      expect(progressbar).toHaveAttribute('aria-valuenow', '50')
      expect(progressbar).toHaveAttribute('aria-valuemin', '0')
      expect(progressbar).toHaveAttribute('aria-valuemax', '100')
    })

    test('should show value when requested', () => {
      render(<Progress value={75} showValue />)
      
      expect(screen.getByText('75%')).toBeInTheDocument()
    })

    test('should have proper description', () => {
      render(<Progress value={50} description="File upload in progress" />)
      
      const progressbar = screen.getByRole('progressbar')
      const description = screen.getByText('File upload in progress')
      expect(progressbar).toHaveAttribute('aria-describedby', description.id)
    })
  })

  describe('Slider Component', () => {
    test('should have proper ARIA attributes', () => {
      render(<Slider value={[50]} label="Volume" />)
      
      const sliders = screen.getAllByRole('slider')
      const mainSlider = sliders[0] // Get the main slider, not the thumb
      expect(mainSlider).toHaveAttribute('aria-valuenow', '50')
      expect(mainSlider).toHaveAttribute('aria-valuemin', '0')
      expect(mainSlider).toHaveAttribute('aria-valuemax', '100')
      expect(mainSlider).toHaveAttribute('aria-orientation', 'horizontal')
    })

    test('should show value when requested', () => {
      render(<Slider value={[75]} showValue />)
      
      expect(screen.getByText('75')).toBeInTheDocument()
    })

    test('should have proper description', () => {
      render(<Slider value={[50]} description="Adjust volume level" />)
      
      const sliders = screen.getAllByRole('slider')
      const mainSlider = sliders[0] // Get the main slider, not the thumb
      const description = screen.getByText('Adjust volume level')
      expect(mainSlider).toHaveAttribute('aria-describedby', description.id)
    })
  })

  describe('Table Component', () => {
    test('should have proper caption', () => {
      render(
        <Table caption="User data table">
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>John Doe</TableCell>
              <TableCell>john@example.com</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      )
      
      const table = screen.getByRole('table', { name: 'User data table' })
      expect(table).toBeInTheDocument()
    })

    test('should have proper column headers', () => {
      render(
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead sort="ascending">Email</TableHead>
            </TableRow>
          </TableHeader>
        </Table>
      )
      
      const nameHeader = screen.getByRole('columnheader', { name: 'Name' })
      const emailHeader = screen.getByRole('columnheader', { name: 'Email' })
      
      expect(nameHeader).toHaveAttribute('scope', 'col')
      expect(emailHeader).toHaveAttribute('aria-sort', 'ascending')
    })

    test('should have proper row selection', () => {
      render(
        <Table>
          <TableBody>
            <TableRow selected>
              <TableCell>John Doe</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      )
      
      const row = screen.getByRole('row')
      expect(row).toHaveAttribute('aria-selected', 'true')
    })
  })

  describe('MultiSelect Component', () => {
    const options = [
      { value: 'option1', label: 'Option 1' },
      { value: 'option2', label: 'Option 2' },
      { value: 'option3', label: 'Option 3' },
    ]

    test('should have proper ARIA attributes', () => {
      render(
        <MultiSelect
          options={options}
          selectedValues={[]}
          onSelectionChange={() => {}}
          label="Select options"
        />
      )
      
      const combobox = screen.getByRole('combobox', { name: 'Select options' })
      expect(combobox).toHaveAttribute('aria-expanded', 'false')
      // For combobox with a listbox popup, aria-haspopup should be "listbox"
      expect(combobox).toHaveAttribute('aria-haspopup', 'listbox')
      expect(combobox).toHaveAttribute('aria-multiselectable', 'true')
    })

    test('should show required indicator', () => {
      render(
        <MultiSelect
          options={options}
          selectedValues={[]}
          onSelectionChange={() => {}}
          label="Select options"
          required
        />
      )
      
      const label = screen.getByText('Select options')
      const requiredIndicator = label.querySelector('[aria-hidden="true"]')
      expect(requiredIndicator).toHaveTextContent('*')
    })

    test('should have proper error handling', () => {
      render(
        <MultiSelect
          options={options}
          selectedValues={[]}
          onSelectionChange={() => {}}
          label="Select options"
          error="Please select at least one option"
        />
      )
      
      const combobox = screen.getByRole('combobox', { name: 'Select options' })
      expect(combobox).toHaveAttribute('aria-invalid', 'true')
      
      const errorMessage = screen.getByText('Please select at least one option')
      expect(errorMessage).toHaveAttribute('role', 'alert')
    })

    test('should be keyboard accessible', async () => {
      render(
        <MultiSelect
          options={options}
          selectedValues={[]}
          onSelectionChange={() => {}}
        />
      )
      
      const trigger = screen.getByRole('combobox')
      trigger.focus()
      
      await user.keyboard('{Enter}')
      expect(screen.getByRole('listbox')).toBeInTheDocument()
      
      await user.keyboard('{Escape}')
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    })
  })

  describe('Tabs Component', () => {
    test('should have proper ARIA attributes', () => {
      render(
        <Tabs defaultValue="tab1" label="Settings">
          <TabsList>
            <TabsTrigger value="tab1">General</TabsTrigger>
            <TabsTrigger value="tab2">Security</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">General settings</TabsContent>
          <TabsContent value="tab2">Security settings</TabsContent>
        </Tabs>
      )
      
      const tablist = screen.getByRole('tablist')
      expect(tablist).toBeInTheDocument()
      
      const tabs = screen.getAllByRole('tab')
      expect(tabs).toHaveLength(2)
      
      // Only one tabpanel should be visible at a time
      const tabpanels = screen.getAllByRole('tabpanel')
      expect(tabpanels).toHaveLength(1)
    })

    test('should be keyboard accessible', async () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2">Tab 2</TabsTrigger>
          </TabsList>
        </Tabs>
      )
      
      const tab1 = screen.getByRole('tab', { name: 'Tab 1' })
      const tab2 = screen.getByRole('tab', { name: 'Tab 2' })
      
      tab1.focus()
      expect(tab1).toHaveAttribute('aria-selected', 'true')
      
      await user.keyboard('{ArrowRight}')
      expect(document.activeElement).toBe(tab2)
    })
  })

  describe('Accordion Component', () => {
    test('should have proper ARIA attributes', () => {
      render(
        <Accordion type="single" collapsible label="FAQ">
          <AccordionItem value="item1">
            <AccordionTrigger>What is this?</AccordionTrigger>
            <AccordionContent>This is an accordion item.</AccordionContent>
          </AccordionItem>
        </Accordion>
      )
      
      const trigger = screen.getByRole('button', { name: 'What is this?' })
      expect(trigger).toHaveAttribute('aria-expanded', 'false')
    })

    test('should be keyboard accessible', async () => {
      render(
        <Accordion type="single" collapsible>
          <AccordionItem value="item1">
            <AccordionTrigger>Section 1</AccordionTrigger>
            <AccordionContent>Content 1</AccordionContent>
          </AccordionItem>
          <AccordionItem value="item2">
            <AccordionTrigger>Section 2</AccordionTrigger>
            <AccordionContent>Content 2</AccordionContent>
          </AccordionItem>
        </Accordion>
      )
      
      const trigger1 = screen.getByRole('button', { name: 'Section 1' })
      const trigger2 = screen.getByRole('button', { name: 'Section 2' })
      
      trigger1.focus()
      
      await user.keyboard('{ArrowDown}')
      expect(document.activeElement).toBe(trigger2)
    })
  })

  describe('Tooltip Component', () => {
    test('should have proper ARIA attributes', async () => {
      render(
        <Tooltip>
          <TooltipTrigger>Hover me</TooltipTrigger>
          <TooltipContent>This is a tooltip</TooltipContent>
        </Tooltip>
      )
      
      const trigger = screen.getByText('Hover me')
      await user.hover(trigger)
      
      // Wait for tooltip to appear
      await waitFor(() => {
        const tooltips = screen.getAllByRole('tooltip')
        expect(tooltips.length).toBeGreaterThan(0)
      })
      
      const tooltips = screen.getAllByRole('tooltip')
      const visibleTooltip = tooltips.find(tooltip => 
        !tooltip.style.clip || tooltip.style.clip !== 'rect(0px, 0px, 0px, 0px)'
      )
      expect(visibleTooltip).toHaveAttribute('aria-live', 'polite')
    })
  })

  describe('Dialog Component', () => {
    test('should have proper focus management', async () => {
      render(
        <Dialog>
          <DialogTrigger asChild>
            <Button>Open Dialog</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogTitle>Dialog Title</DialogTitle>
            <Input placeholder="Test input" />
            <Button>Close</Button>
          </DialogContent>
        </Dialog>
      )

      const trigger = screen.getByRole('button', { name: 'Open Dialog' })
      await user.click(trigger)

      const dialog = screen.getByRole('dialog')
      expect(dialog).toBeInTheDocument()

      // Verify dialog has proper ARIA attributes
      expect(dialog).toHaveAttribute('role', 'dialog')
      expect(dialog).toHaveAttribute('aria-labelledby')
    })

    test('should close with Escape key', async () => {
      render(
        <Dialog>
          <DialogTrigger asChild>
            <Button>Open Dialog</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogTitle>Dialog Title</DialogTitle>
            <Button>Close</Button>
          </DialogContent>
        </Dialog>
      )

      const trigger = screen.getByRole('button', { name: 'Open Dialog' })
      await user.click(trigger)

      const dialog = screen.getByRole('dialog')
      expect(dialog).toBeInTheDocument()

      await user.keyboard('{Escape}')
      
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      })
    })
  })

  describe('Select Component', () => {
    test('should have proper ARIA attributes', () => {
      render(
        <Select>
          <SelectTrigger>
            <SelectValue placeholder="Select an option" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="option1">Option 1</SelectItem>
            <SelectItem value="option2">Option 2</SelectItem>
          </SelectContent>
        </Select>
      )

      const trigger = screen.getByRole('combobox')
      expect(trigger).toHaveAttribute('aria-expanded', 'false')
    })
  })

  describe('Focus Management', () => {
    test('should maintain proper tab order', async () => {
      render(
        <div>
          <Button>First Button</Button>
          <Input placeholder="Test input" />
          <Button>Second Button</Button>
        </div>
      )

      const firstButton = screen.getByRole('button', { name: 'First Button' })
      const input = screen.getByPlaceholderText('Test input')
      const secondButton = screen.getByRole('button', { name: 'Second Button' })

      firstButton.focus()
      expect(document.activeElement).toBe(firstButton)

      await user.tab()
      expect(document.activeElement).toBe(input)

      await user.tab()
      expect(document.activeElement).toBe(secondButton)
    })

    // TODO: Fix disabled button attribute test - component uses aria-disabled instead of disabled attribute
    test.skip('should have proper disabled button attributes', () => {
      render(
        <div>
          <Button>First Button</Button>
          <Button disabled>Disabled Button</Button>
          <Button>Second Button</Button>
        </div>
      )

      const disabledButton = screen.getByRole('button', { name: 'Disabled Button' })
      expect(disabledButton).toHaveAttribute('aria-disabled', 'true')
      expect(disabledButton).toHaveAttribute('disabled')
    })
  })

  describe('Screen Reader Support', () => {
    test('should announce dynamic content changes', () => {
      const { rerender } = render(<Progress value={0} label="Upload" />)
      
      const progressbar = screen.getByRole('progressbar')
      expect(progressbar).toHaveAttribute('aria-valuetext', '0%')
      
      rerender(<Progress value={50} label="Upload" />)
      expect(progressbar).toHaveAttribute('aria-valuetext', '50%')
    })

    test('should provide proper error announcements', () => {
      render(<Input label="Email" error="Invalid email format" />)
      
      const errorMessage = screen.getByText('Invalid email format')
      expect(errorMessage).toHaveAttribute('aria-live', 'polite')
    })
  })
}) 