import type { ScrapedPart } from '../__types__/index.js'

// ── Color Canonicalization ────────────────────────────────────────────────────

const COLOR_ALIASES: Record<string, string> = {
  'dark grey': 'Dark Bluish Gray',
  'dark gray': 'Dark Bluish Gray',
  'dark bluish grey': 'Dark Bluish Gray',
  'light grey': 'Light Bluish Gray',
  'light gray': 'Light Bluish Gray',
  'light bluish grey': 'Light Bluish Gray',
  grey: 'Light Bluish Gray',
  gray: 'Light Bluish Gray',
  'bright red': 'Red',
  'bright blue': 'Blue',
  'bright yellow': 'Yellow',
  'bright green': 'Green',
  'bright orange': 'Orange',
  'dark tan': 'Dark Tan',
  'medium nougat': 'Medium Nougat',
  'reddish brown': 'Reddish Brown',
  'sand green': 'Sand Green',
  'dark blue': 'Dark Blue',
  'dark red': 'Dark Red',
  'dark green': 'Dark Green',
  'olive green': 'Olive Green',
  'earth blue': 'Dark Blue',
  'earth green': 'Dark Green',
}

export function canonicalizeColor(color: string): string {
  const lower = color.toLowerCase().trim()
  return COLOR_ALIASES[lower] || color.trim()
}

// ── Part Number Normalization ─────────────────────────────────────────────────

export function normalizePartNumber(partNumber: string): string {
  // Remove leading zeros, normalize separators
  let normalized = partNumber.trim()

  // Some part numbers have alternate suffixes like "3001a" vs "3001"
  // Keep the suffix for accuracy
  normalized = normalized.replace(/^0+/, '')

  return normalized || partNumber.trim()
}

// ── Category Standardization ──────────────────────────────────────────────────

const CATEGORY_ALIASES: Record<string, string> = {
  plate: 'Plates',
  plates: 'Plates',
  brick: 'Bricks',
  bricks: 'Bricks',
  tile: 'Tiles',
  tiles: 'Tiles',
  slope: 'Slopes',
  slopes: 'Slopes',
  technic: 'Technic',
  'technic beam': 'Technic',
  'technic pin': 'Technic',
  minifig: 'Minifigure Parts',
  'minifig part': 'Minifigure Parts',
  'minifigure part': 'Minifigure Parts',
}

export function normalizeCategory(category: string): string {
  const lower = category.toLowerCase().trim()
  return CATEGORY_ALIASES[lower] || category.trim()
}

// ── Full Part Normalization ───────────────────────────────────────────────────

export function normalizePart(part: ScrapedPart): ScrapedPart {
  return {
    ...part,
    partNumber: normalizePartNumber(part.partNumber),
    color: canonicalizeColor(part.color),
    category: normalizeCategory(part.category),
    name: part.name.trim(),
  }
}

export function normalizeParts(parts: ScrapedPart[]): ScrapedPart[] {
  return parts.map(normalizePart)
}

// ── Deduplication ─────────────────────────────────────────────────────────────

export function deduplicateParts(parts: ScrapedPart[]): ScrapedPart[] {
  const byKey = new Map<string, ScrapedPart>()

  for (const part of parts) {
    const key = `${part.partNumber}|${part.color}`
    const existing = byKey.get(key)

    if (existing) {
      // Merge quantities
      byKey.set(key, {
        ...existing,
        quantity: existing.quantity + part.quantity,
        // Keep the more complete name/category
        name: existing.name || part.name,
        category: existing.category || part.category,
        imageUrl: existing.imageUrl || part.imageUrl,
      })
    } else {
      byKey.set(key, { ...part })
    }
  }

  return Array.from(byKey.values())
}
