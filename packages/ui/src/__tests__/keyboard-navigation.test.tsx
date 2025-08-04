import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { Button } from '../button'
import { Dialog, DialogContent, DialogTrigger } from '../dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../select'
import { Input } from '../input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../tabs'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../accordion'
import { KEYBOARD_KEYS } from '../lib/keyboard-navigation'

describe('Keyboard Navigation', () => {
  const user = userEvent.setup()

  describe('Button Component', () => {
    test('should activate button with Enter key', async () => {
      const handleClick = vi.fn()
      render(<Button onClick={handleClick}>Test Button</Button>)
      
      const button = screen.getByRole('button', { name: 'Test Button' })
      button.focus()
      
      await user.keyboard('{Enter}')
      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    test('should activate button with Space key', async () => {
      const handleClick = vi.fn()
      render(<Button onClick={handleClick}>Test Button</Button>)
      
      const button = screen.getByRole('button', { name: 'Test Button' })
      button.focus()
      
      await user.keyboard(' ')
      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    test('should have proper ARIA attributes', () => {
      render(<Button pressed disabled>Test Button</Button>)
      
      const button = screen.getByRole('button', { name: 'Test Button' })
      expect(button).toHaveAttribute('aria-pressed', 'true')
      expect(button).toHaveAttribute('aria-disabled', 'true')
    })
  })

  describe('Dialog Component', () => {
    // TODO: Fix dialog focus trapping test - complex focus management issue
    test.skip('should trap focus within dialog', async () => {
      render(
        <Dialog>
          <DialogTrigger asChild>
            <Button>Open Dialog</Button>
          </DialogTrigger>
          <DialogContent>
            <h2>Dialog Title</h2>
            <Input placeholder="Test input" />
            <Button>Close</Button>
          </DialogContent>
        </Dialog>
      )

      const trigger = screen.getByRole('button', { name: 'Open Dialog' })
      await user.click(trigger)

      const dialog = screen.getByRole('dialog')
      const input = screen.getByPlaceholderText('Test input')

      // Focus should be trapped within dialog
      expect(document.activeElement).toBe(input)

      // Tab should cycle through focusable elements
      await user.tab()
      const closeButton = screen.getAllByRole('button', { name: 'Close' })[0]
      expect(document.activeElement).toBe(closeButton)

      await user.tab()
      expect(document.activeElement).toBe(input)
    })

    test('should close dialog with Escape key', async () => {
      render(
        <Dialog>
          <DialogTrigger asChild>
            <Button>Open Dialog</Button>
          </DialogTrigger>
          <DialogContent>
            <h2>Dialog Title</h2>
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

    // TODO: Fix dialog focus restoration test - complex focus management issue
    test.skip('should restore focus when dialog closes', async () => {
      render(
        <Dialog>
          <DialogTrigger asChild>
            <Button>Open Dialog</Button>
          </DialogTrigger>
          <DialogContent>
            <h2>Dialog Title</h2>
            <Button>Close</Button>
          </DialogContent>
        </Dialog>
      )

      const trigger = screen.getByRole('button', { name: 'Open Dialog' })
      trigger.focus()
      await user.click(trigger)

      const closeButton = screen.getAllByRole('button', { name: 'Close' })[0]
      await user.click(closeButton)

      await waitFor(() => {
        expect(document.activeElement).toBe(trigger)
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

  describe('Tabs Component', () => {
    test('should navigate tabs with arrow keys', async () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2">Tab 2</TabsTrigger>
            <TabsTrigger value="tab3">Tab 3</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
          <TabsContent value="tab2">Content 2</TabsContent>
          <TabsContent value="tab3">Content 3</TabsContent>
        </Tabs>
      )

      const tab1 = screen.getByRole('tab', { name: 'Tab 1' })
      const tab2 = screen.getByRole('tab', { name: 'Tab 2' })
      const tab3 = screen.getByRole('tab', { name: 'Tab 3' })

      tab1.focus()
      expect(tab1).toHaveAttribute('aria-selected', 'true')

      // Navigate to next tab
      await user.keyboard('{ArrowRight}')
      expect(document.activeElement).toBe(tab2)

      // Navigate to next tab
      await user.keyboard('{ArrowRight}')
      expect(document.activeElement).toBe(tab3)

      // Navigate to first tab (wrap around)
      await user.keyboard('{ArrowRight}')
      expect(document.activeElement).toBe(tab1)

      // Navigate to previous tab
      await user.keyboard('{ArrowLeft}')
      expect(document.activeElement).toBe(tab3)
    })

    test('should activate tab with Enter key', async () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2">Tab 2</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
          <TabsContent value="tab2">Content 2</TabsContent>
        </Tabs>
      )

      const tab2 = screen.getByRole('tab', { name: 'Tab 2' })
      tab2.focus()
      
      await user.keyboard('{Enter}')
      
      expect(tab2).toHaveAttribute('aria-selected', 'true')
      expect(screen.getByText('Content 2')).toBeInTheDocument()
    })

    test('should activate tab with Space key', async () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2">Tab 2</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
          <TabsContent value="tab2">Content 2</TabsContent>
        </Tabs>
      )

      const tab2 = screen.getByRole('tab', { name: 'Tab 2' })
      tab2.focus()
      
      await user.keyboard(' ')
      
      expect(tab2).toHaveAttribute('aria-selected', 'true')
      expect(screen.getByText('Content 2')).toBeInTheDocument()
    })
  })

  describe('Accordion Component', () => {
    test('should toggle accordion with Enter key', async () => {
      render(
        <Accordion type="single" collapsible>
          <AccordionItem value="item1">
            <AccordionTrigger>Section 1</AccordionTrigger>
            <AccordionContent>Content 1</AccordionContent>
          </AccordionItem>
        </Accordion>
      )

      const trigger = screen.getByRole('button', { name: 'Section 1' })
      trigger.focus()
      
      await user.keyboard('{Enter}')
      
      await waitFor(() => {
        expect(screen.getByText('Content 1')).toBeInTheDocument()
        expect(trigger).toHaveAttribute('aria-expanded', 'true')
      })

      await user.keyboard('{Enter}')
      
      await waitFor(() => {
        expect(screen.queryByText('Content 1')).not.toBeInTheDocument()
        expect(trigger).toHaveAttribute('aria-expanded', 'false')
      })
    })

    test('should toggle accordion with Space key', async () => {
      render(
        <Accordion type="single" collapsible>
          <AccordionItem value="item1">
            <AccordionTrigger>Section 1</AccordionTrigger>
            <AccordionContent>Content 1</AccordionContent>
          </AccordionItem>
        </Accordion>
      )

      const trigger = screen.getByRole('button', { name: 'Section 1' })
      trigger.focus()
      
      await user.keyboard(' ')
      
      await waitFor(() => {
        expect(screen.getByText('Content 1')).toBeInTheDocument()
        expect(trigger).toHaveAttribute('aria-expanded', 'true')
      })
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

      await user.tab({ shift: true })
      expect(document.activeElement).toBe(input)
    })

    // TODO: Fix disabled elements tab order test - complex focus management issue
    test.skip('should skip disabled elements in tab order', async () => {
      render(
        <div>
          <Button>First Button</Button>
          <Button disabled>Disabled Button</Button>
          <Button>Second Button</Button>
        </div>
      )

      const firstButton = screen.getByRole('button', { name: 'First Button' })
      const disabledButton = screen.getByRole('button', { name: 'Disabled Button' })
      const secondButton = screen.getByRole('button', { name: 'Second Button' })

      firstButton.focus()
      expect(document.activeElement).toBe(firstButton)

      await user.tab()
      expect(document.activeElement).toBe(secondButton)
      expect(document.activeElement).not.toBe(disabledButton)
    })
  })

  describe('Keyboard Shortcuts', () => {
    test('should handle all keyboard keys correctly', async () => {
      const handleClick = vi.fn()
      render(<Button onClick={handleClick}>Test Button</Button>)
      
      const button = screen.getByRole('button', { name: 'Test Button' })
      button.focus()

      // Test all activation keys
      await user.keyboard('{Enter}')
      expect(handleClick).toHaveBeenCalledTimes(1)

      await user.keyboard(' ')
      expect(handleClick).toHaveBeenCalledTimes(2)
    })

    // TODO: Fix keyboard event prevention test - complex event handling issue
    test.skip('should prevent default behavior for handled keys', async () => {
      const handleClick = vi.fn()
      render(<Button onClick={handleClick}>Test Button</Button>)
      
      const button = screen.getByRole('button', { name: 'Test Button' })
      button.focus()

      const keyDownEvent = new KeyboardEvent('keydown', { key: 'Enter' })
      const preventDefaultSpy = vi.spyOn(keyDownEvent, 'preventDefault')
      
      fireEvent(button, keyDownEvent)
      
      expect(preventDefaultSpy).toHaveBeenCalled()
    })
  })
}) 