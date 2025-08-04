import { useEffect, useRef, useCallback } from 'react'

// Keyboard navigation constants
export const KEYBOARD_KEYS = {
  ENTER: 'Enter',
  SPACE: ' ',
  ESCAPE: 'Escape',
  TAB: 'Tab',
  ARROW_UP: 'ArrowUp',
  ARROW_DOWN: 'ArrowDown',
  ARROW_LEFT: 'ArrowLeft',
  ARROW_RIGHT: 'ArrowRight',
  HOME: 'Home',
  END: 'End',
  PAGE_UP: 'PageUp',
  PAGE_DOWN: 'PageDown',
} as const

export const KEYBOARD_SHORTCUTS = {
  // Navigation shortcuts
  NEXT_ITEM: [KEYBOARD_KEYS.ARROW_DOWN, KEYBOARD_KEYS.ARROW_RIGHT],
  PREV_ITEM: [KEYBOARD_KEYS.ARROW_UP, KEYBOARD_KEYS.ARROW_LEFT],
  FIRST_ITEM: [KEYBOARD_KEYS.HOME],
  LAST_ITEM: [KEYBOARD_KEYS.END],
  SELECT_ITEM: [KEYBOARD_KEYS.ENTER, KEYBOARD_KEYS.SPACE],
  CLOSE: [KEYBOARD_KEYS.ESCAPE],
  TOGGLE: [KEYBOARD_KEYS.ENTER, KEYBOARD_KEYS.SPACE],
} as const

// Enhanced ARIA utilities for better accessibility
export const getAriaAttributes = (options: {
  expanded?: boolean
  selected?: boolean
  disabled?: boolean
  pressed?: boolean
  current?: boolean
  describedBy?: string
  controls?: string
  owns?: string
  label?: string
  labelledBy?: string
  hidden?: boolean
  live?: 'polite' | 'assertive' | 'off'
  atomic?: boolean
  relevant?: 'additions' | 'removals' | 'text' | 'all'
  busy?: boolean
  invalid?: boolean
  required?: boolean
  hasPopup?: boolean
  popup?: 'true' | 'false' | 'menu' | 'listbox' | 'tree' | 'grid' | 'dialog'
  sort?: 'ascending' | 'descending' | 'none' | 'other'
  valueNow?: number
  valueMin?: number
  valueMax?: number
  valueText?: string
  orientation?: 'horizontal' | 'vertical'
  autocomplete?: 'inline' | 'list' | 'both' | 'none'
  multiselectable?: boolean
  readOnly?: boolean
  placeholder?: string
}) => {
  const attributes: Record<string, string | boolean | number> = {}

  // Basic ARIA attributes
  if (options.expanded !== undefined) {
    attributes['aria-expanded'] = options.expanded
  }
  if (options.selected !== undefined) {
    attributes['aria-selected'] = options.selected
  }
  if (options.disabled !== undefined) {
    attributes['aria-disabled'] = options.disabled
  }
  if (options.pressed !== undefined) {
    attributes['aria-pressed'] = options.pressed
  }
  if (options.current !== undefined) {
    attributes['aria-current'] = options.current
  }
  if (options.describedBy) {
    attributes['aria-describedby'] = options.describedBy
  }
  if (options.controls) {
    attributes['aria-controls'] = options.controls
  }
  if (options.owns) {
    attributes['aria-owns'] = options.owns
  }
  if (options.label) {
    attributes['aria-label'] = options.label
  }
  if (options.labelledBy) {
    attributes['aria-labelledby'] = options.labelledBy
  }
  if (options.hidden !== undefined) {
    attributes['aria-hidden'] = options.hidden
  }
  if (options.live) {
    attributes['aria-live'] = options.live
  }
  if (options.atomic !== undefined) {
    attributes['aria-atomic'] = options.atomic
  }
  if (options.relevant) {
    attributes['aria-relevant'] = options.relevant
  }
  if (options.busy !== undefined) {
    attributes['aria-busy'] = options.busy
  }
  if (options.invalid !== undefined) {
    attributes['aria-invalid'] = options.invalid
  }
  if (options.required !== undefined) {
    attributes['aria-required'] = options.required
  }
  if (options.hasPopup !== undefined) {
    attributes['aria-haspopup'] = options.hasPopup
  }
  if (options.popup) {
    attributes['aria-popup'] = options.popup
  }
  if (options.sort) {
    attributes['aria-sort'] = options.sort
  }
  if (options.valueNow !== undefined) {
    attributes['aria-valuenow'] = options.valueNow
  }
  if (options.valueMin !== undefined) {
    attributes['aria-valuemin'] = options.valueMin
  }
  if (options.valueMax !== undefined) {
    attributes['aria-valuemax'] = options.valueMax
  }
  if (options.valueText) {
    attributes['aria-valuetext'] = options.valueText
  }
  if (options.orientation) {
    attributes['aria-orientation'] = options.orientation
  }
  if (options.autocomplete) {
    attributes['aria-autocomplete'] = options.autocomplete
  }
  if (options.multiselectable !== undefined) {
    attributes['aria-multiselectable'] = options.multiselectable
  }
  if (options.readOnly !== undefined) {
    attributes['aria-readonly'] = options.readOnly
  }
  if (options.placeholder) {
    attributes['aria-placeholder'] = options.placeholder
  }

  return attributes
}

// Focus management utilities
export const useFocusTrap = (isActive: boolean = false) => {
  const containerRef = useRef<HTMLElement>(null)
  const focusableElementsRef = useRef<HTMLElement[]>([])

  const getFocusableElements = useCallback(() => {
    if (!containerRef.current) return []
    
    return Array.from(
      containerRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"]), [contenteditable="true"], [role="button"], [role="tab"], [role="menuitem"], [role="option"]'
      )
    ).filter(el => !(el as any).disabled && el.offsetParent !== null && el.style.display !== 'none')
  }, [])

  const focusFirstElement = useCallback(() => {
    const focusableElements = getFocusableElements()
    if (focusableElements.length > 0) {
      focusableElements[0].focus()
    }
  }, [getFocusableElements])

  const focusLastElement = useCallback(() => {
    const focusableElements = getFocusableElements()
    if (focusableElements.length > 0) {
      focusableElements[focusableElements.length - 1].focus()
    }
  }, [getFocusableElements])

  const focusNextElement = useCallback(() => {
    const focusableElements = getFocusableElements()
    const currentIndex = focusableElements.findIndex(el => el === document.activeElement)
    const nextIndex = currentIndex < focusableElements.length - 1 ? currentIndex + 1 : 0
    focusableElements[nextIndex]?.focus()
  }, [getFocusableElements])

  const focusPreviousElement = useCallback(() => {
    const focusableElements = getFocusableElements()
    const currentIndex = focusableElements.findIndex(el => el === document.activeElement)
    const prevIndex = currentIndex > 0 ? currentIndex - 1 : focusableElements.length - 1
    focusableElements[prevIndex]?.focus()
  }, [getFocusableElements])

  useEffect(() => {
    if (!isActive) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === KEYBOARD_KEYS.TAB) {
        event.preventDefault()
        if (event.shiftKey) {
          focusPreviousElement()
        } else {
          focusNextElement()
        }
      }
    }

    const container = containerRef.current
    if (container) {
      container.addEventListener('keydown', handleKeyDown)
      focusFirstElement()
      
      return () => {
        container.removeEventListener('keydown', handleKeyDown)
      }
    }
  }, [isActive, focusFirstElement, focusNextElement, focusPreviousElement])

  return {
    containerRef,
    focusFirstElement,
    focusLastElement,
    focusNextElement,
    focusPreviousElement,
    getFocusableElements,
  }
}

// Keyboard event handler utilities
export const createKeyboardHandler = (
  handlers: Record<string, (event: KeyboardEvent) => void>
) => {
  return (event: KeyboardEvent) => {
    const handler = handlers[event.key]
    if (handler) {
      event.preventDefault()
      handler(event)
    }
  }
}

// Focus restoration utility
export const useFocusRestoration = () => {
  const previousFocusRef = useRef<HTMLElement | null>(null)

  const saveFocus = useCallback(() => {
    previousFocusRef.current = document.activeElement as HTMLElement
  }, [])

  const restoreFocus = useCallback(() => {
    if (previousFocusRef.current) {
      previousFocusRef.current.focus()
    }
  }, [])

  return { saveFocus, restoreFocus }
}

// Enhanced live region utilities for screen readers
export const useLiveRegion = () => {
  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    const liveRegion = document.getElementById('live-region') || createLiveRegion()
    liveRegion.setAttribute('aria-live', priority)
    liveRegion.textContent = message
    
    // Clear the message after a short delay to allow for multiple announcements
    setTimeout(() => {
      liveRegion.textContent = ''
    }, 1000)
  }, [])

  const announceBusy = useCallback((isBusy: boolean) => {
    const liveRegion = document.getElementById('live-region') || createLiveRegion()
    liveRegion.setAttribute('aria-busy', isBusy.toString())
  }, [])

  return { announce, announceBusy }
}

const createLiveRegion = () => {
  const liveRegion = document.createElement('div')
  liveRegion.id = 'live-region'
  liveRegion.setAttribute('aria-live', 'polite')
  liveRegion.setAttribute('aria-atomic', 'true')
  liveRegion.setAttribute('aria-hidden', 'true')
  liveRegion.style.position = 'absolute'
  liveRegion.style.left = '-10000px'
  liveRegion.style.width = '1px'
  liveRegion.style.height = '1px'
  liveRegion.style.overflow = 'hidden'
  liveRegion.style.clip = 'rect(0, 0, 0, 0)'
  document.body.appendChild(liveRegion)
  return liveRegion
}

// Keyboard navigation context for managing global keyboard shortcuts
export const useKeyboardNavigationContext = () => {
  const shortcutsRef = useRef<Map<string, () => void>>(new Map())

  const registerShortcut = useCallback((key: string, handler: () => void) => {
    shortcutsRef.current.set(key, handler)
  }, [])

  const unregisterShortcut = useCallback((key: string) => {
    shortcutsRef.current.delete(key)
  }, [])

  useEffect(() => {
    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      // Don't handle shortcuts when typing in input fields
      if (event.target instanceof HTMLInputElement || 
          event.target instanceof HTMLTextAreaElement ||
          event.target instanceof HTMLSelectElement ||
          (event.target as HTMLElement).contentEditable === 'true') {
        return
      }

      const key = event.key
      const handler = shortcutsRef.current.get(key)
      if (handler) {
        event.preventDefault()
        handler()
      }
    }

    document.addEventListener('keydown', handleGlobalKeyDown)
    return () => document.removeEventListener('keydown', handleGlobalKeyDown)
  }, [])

  return { registerShortcut, unregisterShortcut }
}

// Utility to generate unique IDs for ARIA relationships
export const useUniqueId = (prefix: string = 'id') => {
  const idRef = useRef<string>('')
  
  if (!idRef.current) {
    idRef.current = `${prefix}-${Math.random().toString(36).substr(2, 9)}`
  }
  
  return idRef.current
}

// Utility to check if element is focusable
export const isFocusable = (element: HTMLElement): boolean => {
  const tagName = element.tagName.toLowerCase()
  const tabIndex = element.getAttribute('tabindex')
  
  // Elements that are naturally focusable
  if (['input', 'select', 'textarea', 'button', 'a'].includes(tagName)) {
    return !(element as any).disabled && element.offsetParent !== null
  }
  
  // Elements with tabindex >= 0
  if (tabIndex !== null && parseInt(tabIndex) >= 0) {
    return element.offsetParent !== null
  }
  
  // Elements with contenteditable
  if (element.contentEditable === 'true') {
    return element.offsetParent !== null
  }
  
  return false
}

// Utility to get the next focusable element
export const getNextFocusableElement = (currentElement: HTMLElement, direction: 'forward' | 'backward' = 'forward'): HTMLElement | null => {
  const allElements = Array.from(document.querySelectorAll<HTMLElement>('*'))
  const focusableElements = allElements.filter(isFocusable)
  const currentIndex = focusableElements.indexOf(currentElement)
  
  if (currentIndex === -1) return null
  
  if (direction === 'forward') {
    return focusableElements[currentIndex + 1] || focusableElements[0] || null
  } else {
    return focusableElements[currentIndex - 1] || focusableElements[focusableElements.length - 1] || null
  }
}

// Utility to announce changes to screen readers
export const announceToScreenReader = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
  const { announce } = useLiveRegion()
  announce(message, priority)
} 