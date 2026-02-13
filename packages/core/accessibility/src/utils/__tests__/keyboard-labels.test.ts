import { describe, it, expect } from 'vitest'
import { getKeyboardShortcutLabel, keyboardShortcutLabels } from '../keyboard-labels'

describe('getKeyboardShortcutLabel', () => {
  it('should return uppercase for single letters', () => {
    expect(getKeyboardShortcutLabel('a')).toBe('A')
    expect(getKeyboardShortcutLabel('g')).toBe('G')
  })

  it('should return mapped labels for special keys', () => {
    expect(getKeyboardShortcutLabel('Delete')).toBe('Del')
    expect(getKeyboardShortcutLabel('Escape')).toBe('Esc')
    expect(getKeyboardShortcutLabel('Enter')).toBe('Enter')
  })

  it('should return arrow key labels', () => {
    expect(getKeyboardShortcutLabel('ArrowUp')).toBe('Up')
    expect(getKeyboardShortcutLabel('ArrowDown')).toBe('Down')
    expect(getKeyboardShortcutLabel('ArrowLeft')).toBe('Left')
    expect(getKeyboardShortcutLabel('ArrowRight')).toBe('Right')
  })

  it('should default to uppercase for unmapped keys', () => {
    expect(getKeyboardShortcutLabel('x')).toBe('X')
    expect(getKeyboardShortcutLabel('z')).toBe('Z')
  })
})

describe('keyboardShortcutLabels', () => {
  it('should have mappings for navigation keys', () => {
    expect(keyboardShortcutLabels).toHaveProperty('Home', 'Home')
    expect(keyboardShortcutLabels).toHaveProperty('End', 'End')
  })
})
