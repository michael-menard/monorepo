import type { WishlistItem, WishlistFilter } from '../schemas'

// Sort wishlist items based on filter
export const sortWishlistItems = (
  items: WishlistItem[],
  filter: WishlistFilter,
): WishlistItem[] => {
  const sortedItems = [...items]

  switch (filter.sortBy) {
    case 'name':
      sortedItems.sort((a, b) => a.name.localeCompare(b.name))
      break
    case 'price':
      sortedItems.sort((a, b) => {
        const priceA = a.price || 0
        const priceB = b.price || 0
        return priceA - priceB
      })
      break
    case 'priority': {
      const priorityOrder = { high: 3, medium: 2, low: 1 }
      sortedItems.sort((a, b) => {
        const priorityA = priorityOrder[a.priority]
        const priorityB = priorityOrder[b.priority]
        return priorityA - priorityB
      })
      break
    }
    case 'createdAt':
    default:
      sortedItems.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      break
  }

  return filter.sortOrder === 'desc' ? sortedItems.reverse() : sortedItems
}

// Filter wishlist items based on filter criteria
export const filterWishlistItems = (
  items: WishlistItem[],
  filter: WishlistFilter,
): WishlistItem[] => {
  return items.filter(item => {
    // Search filter
    if (filter.search) {
      const searchLower = filter.search.toLowerCase()
      const matchesSearch =
        item.name.toLowerCase().includes(searchLower) ||
        (item.description && item.description.toLowerCase().includes(searchLower)) ||
        (item.category && item.category.toLowerCase().includes(searchLower))
      if (!matchesSearch) return false
    }

    // Category filter
    if (filter.category && item.category !== filter.category) {
      return false
    }

    // Priority filter
    if (filter.priority && item.priority !== filter.priority) {
      return false
    }

    // Purchased filter
    if (filter.isPurchased !== undefined && item.isPurchased !== filter.isPurchased) {
      return false
    }

    return true
  })
}

// Get unique categories from wishlist items
export const getUniqueCategories = (items: WishlistItem[]): string[] => {
  const categories = items
    .map(item => item.category)
    .filter((category): category is string => !!category)
  return [...new Set(categories)].sort()
}

// Calculate total value of wishlist items
export const calculateTotalValue = (items: WishlistItem[]): number => {
  return items.reduce((total, item) => total + (item.price || 0), 0)
}

// Calculate total value of purchased items
export const calculatePurchasedValue = (items: WishlistItem[]): number => {
  return items
    .filter(item => item.isPurchased)
    .reduce((total, item) => total + (item.price || 0), 0)
}

// Format price for display
export const formatPrice = (price: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(price)
}

// Generate a unique ID
export const generateId = (): string => {
  return globalThis.crypto.randomUUID()
}

// Validate URL
export const isValidUrl = (url: string): boolean => {
  try {
    new globalThis.URL(url)
    return true
  } catch {
    return false
  }
}

// Debounce function for search
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number,
): ((...args: Parameters<T>) => void) => {
  let timeout: ReturnType<typeof setTimeout>
  return (...args: Parameters<T>) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}
