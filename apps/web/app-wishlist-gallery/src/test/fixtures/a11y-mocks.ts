/**
 * Accessibility Mock Utilities
 *
 * Provides mock ARIA attributes, focus states, and accessible element
 * configurations for testing accessibility scenarios.
 *
 * @module fixtures/a11y-mocks
 * @see AC8
 */

import { z } from 'zod'

/**
 * Mock focus state configuration
 */
export const MockFocusStateSchema = z.object({
  /** Element is focused */
  isFocused: z.boolean(),
  /** Focus is visible (keyboard navigation) */
  isFocusVisible: z.boolean(),
  /** Element can receive focus */
  isFocusable: z.boolean(),
  /** Tabindex value */
  tabIndex: z.number().optional(),
})

export type MockFocusState = z.infer<typeof MockFocusStateSchema>

/**
 * Mock ARIA attributes for an element
 */
export const MockAriaAttributesSchema = z.object({
  role: z.string().optional(),
  'aria-label': z.string().optional(),
  'aria-labelledby': z.string().optional(),
  'aria-describedby': z.string().optional(),
  'aria-expanded': z.boolean().optional(),
  'aria-selected': z.boolean().optional(),
  'aria-checked': z.union([z.boolean(), z.literal('mixed')]).optional(),
  'aria-pressed': z.boolean().optional(),
  'aria-hidden': z.boolean().optional(),
  'aria-disabled': z.boolean().optional(),
  'aria-live': z.enum(['off', 'polite', 'assertive']).optional(),
  'aria-atomic': z.boolean().optional(),
  'aria-controls': z.string().optional(),
  'aria-owns': z.string().optional(),
  'aria-haspopup': z.union([z.boolean(), z.string()]).optional(),
  'aria-modal': z.boolean().optional(),
  'aria-current': z.union([z.boolean(), z.string()]).optional(),
  'aria-invalid': z.boolean().optional(),
  'aria-required': z.boolean().optional(),
  'aria-readonly': z.boolean().optional(),
  'aria-busy': z.boolean().optional(),
  'aria-valuemin': z.number().optional(),
  'aria-valuemax': z.number().optional(),
  'aria-valuenow': z.number().optional(),
  'aria-valuetext': z.string().optional(),
  'aria-orientation': z.enum(['horizontal', 'vertical']).optional(),
})

export type MockAriaAttributes = z.infer<typeof MockAriaAttributesSchema>

/**
 * Default focus states for different element types
 */
export const defaultFocusStates: Record<string, MockFocusState> = {
  button: {
    isFocused: false,
    isFocusVisible: false,
    isFocusable: true,
    tabIndex: 0,
  },
  disabledButton: {
    isFocused: false,
    isFocusVisible: false,
    isFocusable: false,
    tabIndex: undefined,
  },
  input: {
    isFocused: false,
    isFocusVisible: false,
    isFocusable: true,
    tabIndex: 0,
  },
  link: {
    isFocused: false,
    isFocusVisible: false,
    isFocusable: true,
    tabIndex: 0,
  },
  decorativeElement: {
    isFocused: false,
    isFocusVisible: false,
    isFocusable: false,
    tabIndex: -1,
  },
  rovingTabindexItem: {
    isFocused: false,
    isFocusVisible: false,
    isFocusable: true,
    tabIndex: -1,
  },
  rovingTabindexActiveItem: {
    isFocused: false,
    isFocusVisible: false,
    isFocusable: true,
    tabIndex: 0,
  },
}

/**
 * Mock ARIA configurations for common patterns
 */
export const mockAriaConfigs = {
  /**
   * Button with accessible name
   */
  button: (label: string): MockAriaAttributes => ({
    role: 'button',
    'aria-label': label,
  }),

  /**
   * Toggle button with pressed state
   */
  toggleButton: (label: string, pressed: boolean): MockAriaAttributes => ({
    role: 'button',
    'aria-label': label,
    'aria-pressed': pressed,
  }),

  /**
   * Checkbox with checked state
   */
  checkbox: (
    label: string,
    checked: boolean | 'mixed'
  ): MockAriaAttributes => ({
    role: 'checkbox',
    'aria-label': label,
    'aria-checked': checked,
  }),

  /**
   * Combobox/dropdown configuration
   */
  combobox: (
    label: string,
    expanded: boolean,
    controlsId: string
  ): MockAriaAttributes => ({
    role: 'combobox',
    'aria-label': label,
    'aria-expanded': expanded,
    'aria-controls': controlsId,
    'aria-haspopup': 'listbox',
  }),

  /**
   * Tab in a tablist
   */
  tab: (label: string, selected: boolean, panelId: string): MockAriaAttributes => ({
    role: 'tab',
    'aria-label': label,
    'aria-selected': selected,
    'aria-controls': panelId,
  }),

  /**
   * Tabpanel
   */
  tabpanel: (labelledById: string): MockAriaAttributes => ({
    role: 'tabpanel',
    'aria-labelledby': labelledById,
  }),

  /**
   * Modal dialog
   */
  dialog: (label: string, describedById?: string): MockAriaAttributes => ({
    role: 'dialog',
    'aria-label': label,
    'aria-modal': true,
    'aria-describedby': describedById,
  }),

  /**
   * Alert dialog (for confirmations)
   */
  alertDialog: (label: string, describedById: string): MockAriaAttributes => ({
    role: 'alertdialog',
    'aria-label': label,
    'aria-modal': true,
    'aria-describedby': describedById,
  }),

  /**
   * Live region for status updates
   */
  liveRegion: (
    politeness: 'polite' | 'assertive' = 'polite'
  ): MockAriaAttributes => ({
    role: politeness === 'assertive' ? 'alert' : 'status',
    'aria-live': politeness,
    'aria-atomic': true,
  }),

  /**
   * Form input with validation
   */
  formInput: (
    label: string,
    options: {
      required?: boolean
      invalid?: boolean
      describedById?: string
      readonly?: boolean
    } = {}
  ): MockAriaAttributes => ({
    'aria-label': label,
    'aria-required': options.required,
    'aria-invalid': options.invalid,
    'aria-describedby': options.describedById,
    'aria-readonly': options.readonly,
  }),

  /**
   * Progress indicator
   */
  progressBar: (
    label: string,
    value: number,
    min = 0,
    max = 100
  ): MockAriaAttributes => ({
    role: 'progressbar',
    'aria-label': label,
    'aria-valuenow': value,
    'aria-valuemin': min,
    'aria-valuemax': max,
    'aria-valuetext': `${Math.round((value / max) * 100)}%`,
  }),

  /**
   * Slider control
   */
  slider: (
    label: string,
    value: number,
    min: number,
    max: number,
    orientation: 'horizontal' | 'vertical' = 'horizontal'
  ): MockAriaAttributes => ({
    role: 'slider',
    'aria-label': label,
    'aria-valuenow': value,
    'aria-valuemin': min,
    'aria-valuemax': max,
    'aria-orientation': orientation,
  }),

  /**
   * Menu button
   */
  menuButton: (label: string, expanded: boolean, menuId: string): MockAriaAttributes => ({
    role: 'button',
    'aria-label': label,
    'aria-expanded': expanded,
    'aria-haspopup': 'menu',
    'aria-controls': expanded ? menuId : undefined,
  }),

  /**
   * List item in a list
   */
  listItem: (_positionInSet: number, _setSize: number): MockAriaAttributes => ({
    role: 'listitem',
  }),

  /**
   * Tree item
   */
  treeItem: (label: string, selected: boolean, expanded?: boolean): MockAriaAttributes => ({
    role: 'treeitem',
    'aria-label': label,
    'aria-selected': selected,
    'aria-expanded': expanded,
  }),

  /**
   * Hidden content (decorative or redundant)
   */
  hidden: (): MockAriaAttributes => ({
    'aria-hidden': true,
  }),

  /**
   * Busy loading state
   */
  busy: (label: string): MockAriaAttributes => ({
    'aria-busy': true,
    'aria-label': label,
  }),
}

/**
 * Applies mock ARIA attributes to an element
 *
 * @param element - Element to apply attributes to
 * @param attrs - ARIA attributes to apply
 *
 * @example
 * const button = document.createElement('button')
 * applyAriaAttributes(button, mockAriaConfigs.toggleButton('Favorite', true))
 */
export function applyAriaAttributes(
  element: HTMLElement,
  attrs: MockAriaAttributes
): void {
  for (const [key, value] of Object.entries(attrs)) {
    if (value !== undefined) {
      element.setAttribute(key, String(value))
    }
  }
}

/**
 * Creates an element with ARIA attributes for testing
 *
 * @param tagName - HTML tag name
 * @param attrs - ARIA attributes
 * @param options - Additional element options
 * @returns Created element
 *
 * @example
 * const button = createAccessibleElement('button', mockAriaConfigs.button('Submit'))
 */
export function createAccessibleElement<K extends keyof HTMLElementTagNameMap>(
  tagName: K,
  attrs: MockAriaAttributes,
  options: {
    textContent?: string
    className?: string
    id?: string
  } = {}
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tagName)

  applyAriaAttributes(element, attrs)

  if (options.textContent) {
    element.textContent = options.textContent
  }
  if (options.className) {
    element.className = options.className
  }
  if (options.id) {
    element.id = options.id
  }

  return element
}

/**
 * Creates a mock tablist with tabs for testing
 *
 * @param tabs - Tab configurations
 * @returns Object with tablist and tab elements
 */
export function createMockTablist(
  tabs: Array<{ id: string; label: string; panelId: string }>
): {
  tablist: HTMLElement
  tabs: HTMLElement[]
  panels: HTMLElement[]
} {
  const tablist = document.createElement('div')
  tablist.setAttribute('role', 'tablist')

  const tabElements: HTMLElement[] = []
  const panelElements: HTMLElement[] = []

  tabs.forEach((tab, index) => {
    const tabElement = createAccessibleElement(
      'button',
      mockAriaConfigs.tab(tab.label, index === 0, tab.panelId),
      { id: tab.id, textContent: tab.label }
    )
    tabElement.setAttribute('tabindex', index === 0 ? '0' : '-1')
    tablist.appendChild(tabElement)
    tabElements.push(tabElement)

    const panel = createAccessibleElement(
      'div',
      mockAriaConfigs.tabpanel(tab.id),
      { id: tab.panelId }
    )
    panel.setAttribute('tabindex', '0')
    panelElements.push(panel)
  })

  return { tablist, tabs: tabElements, panels: panelElements }
}

/**
 * Creates a mock modal dialog for testing
 *
 * @param config - Modal configuration
 * @returns Modal element with proper ARIA
 */
export function createMockModal(config: {
  id: string
  title: string
  description?: string
  content?: string
}): {
  modal: HTMLElement
  closeButton: HTMLElement
  titleElement: HTMLElement
  descElement: HTMLElement | null
} {
  const titleId = `${config.id}-title`
  const descId = config.description ? `${config.id}-desc` : undefined

  const modal = createAccessibleElement(
    'div',
    mockAriaConfigs.dialog(config.title, descId),
    { id: config.id }
  )
  modal.setAttribute('aria-labelledby', titleId)

  const titleElement = document.createElement('h2')
  titleElement.id = titleId
  titleElement.textContent = config.title
  modal.appendChild(titleElement)

  let descElement: HTMLElement | null = null
  if (config.description) {
    descElement = document.createElement('p')
    descElement.id = descId!
    descElement.textContent = config.description
    modal.appendChild(descElement)
  }

  if (config.content) {
    const content = document.createElement('div')
    content.textContent = config.content
    modal.appendChild(content)
  }

  const closeButton = createAccessibleElement(
    'button',
    mockAriaConfigs.button('Close dialog'),
    { textContent: 'Close' }
  )
  modal.appendChild(closeButton)

  return { modal, closeButton, titleElement, descElement }
}

/**
 * Creates a mock combobox/select for testing
 *
 * @param config - Combobox configuration
 * @returns Combobox elements
 */
export function createMockCombobox(config: {
  id: string
  label: string
  options: Array<{ value: string; label: string }>
}): {
  container: HTMLElement
  button: HTMLElement
  listbox: HTMLElement
  options: HTMLElement[]
} {
  const listboxId = `${config.id}-listbox`

  const container = document.createElement('div')

  const button = createAccessibleElement(
    'button',
    mockAriaConfigs.combobox(config.label, false, listboxId),
    { id: config.id, textContent: 'Select...' }
  )
  container.appendChild(button)

  const listbox = document.createElement('ul')
  listbox.id = listboxId
  listbox.setAttribute('role', 'listbox')
  listbox.setAttribute('aria-label', config.label)
  listbox.hidden = true

  const optionElements: HTMLElement[] = []
  config.options.forEach((opt, index) => {
    const option = document.createElement('li')
    option.setAttribute('role', 'option')
    option.setAttribute('aria-selected', 'false')
    option.setAttribute('data-value', opt.value)
    option.id = `${config.id}-option-${index}`
    option.textContent = opt.label
    listbox.appendChild(option)
    optionElements.push(option)
  })

  container.appendChild(listbox)

  return { container, button, listbox, options: optionElements }
}

/**
 * Creates a mock live region for testing announcements
 *
 * @param politeness - Politeness level
 * @returns Live region element
 */
export function createMockLiveRegion(
  politeness: 'polite' | 'assertive' = 'polite'
): HTMLElement {
  return createAccessibleElement('div', mockAriaConfigs.liveRegion(politeness))
}

/**
 * Creates a mock form with accessible inputs
 *
 * @param fields - Form field configurations
 * @returns Form elements
 */
export function createMockForm(
  fields: Array<{
    id: string
    label: string
    type?: string
    required?: boolean
  }>
): {
  form: HTMLFormElement
  inputs: HTMLInputElement[]
  labels: HTMLLabelElement[]
} {
  const form = document.createElement('form')

  const inputs: HTMLInputElement[] = []
  const labels: HTMLLabelElement[] = []

  fields.forEach(field => {
    const label = document.createElement('label')
    label.htmlFor = field.id
    label.textContent = field.label
    form.appendChild(label)
    labels.push(label)

    const input = document.createElement('input')
    input.id = field.id
    input.name = field.id
    input.type = field.type || 'text'
    if (field.required) {
      input.required = true
      input.setAttribute('aria-required', 'true')
    }
    form.appendChild(input)
    inputs.push(input)
  })

  return { form, inputs, labels }
}

/**
 * Mock focus management helpers
 */
export const focusMocks = {
  /**
   * Simulates focusing an element
   */
  focus: (element: HTMLElement): void => {
    element.focus()
    element.dispatchEvent(new FocusEvent('focus'))
  },

  /**
   * Simulates blurring an element
   */
  blur: (element: HTMLElement): void => {
    element.blur()
    element.dispatchEvent(new FocusEvent('blur'))
  },

  /**
   * Creates a focus trap container
   */
  createFocusTrap: (focusableElements: HTMLElement[]): HTMLElement => {
    const container = document.createElement('div')
    container.setAttribute('data-focus-trap', 'true')

    focusableElements.forEach(el => container.appendChild(el))

    return container
  },
}

/**
 * Mock keyboard event helpers for accessibility testing
 */
export const keyboardMocks = {
  /**
   * Creates a keyboard event
   */
  createKeyboardEvent: (
    type: 'keydown' | 'keyup' | 'keypress',
    key: string,
    options: Partial<KeyboardEventInit> = {}
  ): KeyboardEvent => {
    return new KeyboardEvent(type, {
      key,
      code: key,
      bubbles: true,
      cancelable: true,
      ...options,
    })
  },

  /**
   * Dispatches a keydown event
   */
  keydown: (element: Element, key: string, options: Partial<KeyboardEventInit> = {}): void => {
    element.dispatchEvent(keyboardMocks.createKeyboardEvent('keydown', key, options))
  },

  /**
   * Dispatches a keyup event
   */
  keyup: (element: Element, key: string, options: Partial<KeyboardEventInit> = {}): void => {
    element.dispatchEvent(keyboardMocks.createKeyboardEvent('keyup', key, options))
  },
}
