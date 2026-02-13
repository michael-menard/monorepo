import { z } from 'zod'

/**
 * Schema for validating WCAG AA contrast ratios
 * Normal text: minimum 4.5:1 ratio
 * Large text: minimum 3:1 ratio
 */
export const ContrastRatioSchema = z.object({
  normalText: z.number().min(4.5),
  largeText: z.number().min(3),
})
