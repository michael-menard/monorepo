import { useEffect, useState } from 'react'

export type AnnouncePriority = 'polite' | 'assertive'

/**
 * Global listeners for screen reader announcements.
 * This is intentionally module-local (per app) rather than window-global.
 */
const listeners = new Set<(message: string, priority: AnnouncePriority) => void>()

/**
 * Imperative helper to announce a message to screen readers.
 *
 * Usage examples:
 * announce('LEGO Castle moved to priority 1')
 * announce('Item removed from wishlist', 'assertive')
 */
export function announce(message: string, priority: AnnouncePriority = 'polite') {
  if (!message) return
  listeners.forEach(listener => listener(message, priority))
}

/**
 * Visually hidden live regions that receive messages from `announce()`.
 * Should be rendered once at the root of the module.
 */
export function Announcer() {
  const [politeMessage, setPoliteMessage] = useState('')
  const [assertiveMessage, setAssertiveMessage] = useState('')

  useEffect(() => {
    const listener = (message: string, priority: AnnouncePriority) => {
      if (priority === 'assertive') {
        setAssertiveMessage(message)
        // Clear after announcement so repeated messages still fire
        setTimeout(() => setAssertiveMessage(''), 1000)
      } else {
        setPoliteMessage(message)
        setTimeout(() => setPoliteMessage(''), 1000)
      }
    }

    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  }, [])

  return (
    <>
      {/* Polite announcements */}
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {politeMessage}
      </div>

      {/* Assertive announcements */}
      <div role="alert" aria-live="assertive" aria-atomic="true" className="sr-only">
        {assertiveMessage}
      </div>
    </>
  )
}
