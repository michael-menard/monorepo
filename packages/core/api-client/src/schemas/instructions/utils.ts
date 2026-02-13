/**
 * Story REPA-016: MOC Form Utility Functions
 *
 * Helper functions for MOC form validation and initialization.
 * Extracted from moc-form.ts for better code organization.
 */

import { MocInstructionFormSchema } from './form'
import type { MocForm, SetForm, MocInstructionForm } from './form'

/**
 * Normalize tags: trim, lowercase, dedupe
 */
export function normalizeTags(tags: string[]): string[] {
  return tags
    .map(t => t.trim().toLowerCase())
    .filter(Boolean)
    .filter((v, i, a) => a.indexOf(v) === i)
}

/**
 * Create empty MOC form with defaults
 */
export function createEmptyMocForm(): MocForm {
  return {
    type: 'moc',
    title: '',
    description: '',
    author: '',
    setNumber: '',
    partsCount: 0,
    theme: '',
    tags: [],
    features: [],
    eventBadges: [],
    status: 'draft',
    visibility: 'private',
  }
}

/**
 * Create empty Set form with defaults
 */
export function createEmptySetForm(): SetForm {
  return {
    type: 'set',
    title: '',
    description: '',
    brand: '',
    setNumber: '',
    theme: '',
    tags: [],
    features: [],
    eventBadges: [],
    status: 'draft',
    visibility: 'private',
    retired: false,
  }
}

/**
 * Check if form is valid for finalization
 */
export function isFormValidForFinalize(form: MocInstructionForm): boolean {
  const result = MocInstructionFormSchema.safeParse(form)
  return result.success
}

/**
 * Get validation errors as a flat object for error summary
 */
export function getFormErrors(form: MocInstructionForm): Record<string, string> {
  const result = MocInstructionFormSchema.safeParse(form)
  if (result.success) return {}

  const errors: Record<string, string> = {}
  for (const issue of result.error.issues) {
    const path = issue.path.join('.')
    errors[path] = issue.message
  }
  return errors
}
