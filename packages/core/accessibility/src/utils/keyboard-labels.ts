/**
 * Keyboard shortcut key names for display
 */
export const keyboardShortcutLabels: Record<string, string> = {
  a: 'A',
  g: 'G',
  Delete: 'Del',
  Enter: 'Enter',
  Escape: 'Esc',
  ArrowUp: 'Up',
  ArrowDown: 'Down',
  ArrowLeft: 'Left',
  ArrowRight: 'Right',
  Home: 'Home',
  End: 'End',
}

/**
 * Get human-readable keyboard shortcut label
 *
 * @param key - Key code or name
 * @returns Human-readable label
 */
export function getKeyboardShortcutLabel(key: string): string {
  return keyboardShortcutLabels[key] ?? key.toUpperCase()
}
