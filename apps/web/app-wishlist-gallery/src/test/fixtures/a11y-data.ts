/**
 * Accessibility Test Data Fixtures
 *
 * Provides test data with proper accessible labels, roles, and descriptions
 * for use in accessibility testing scenarios.
 *
 * @module fixtures/a11y-data
 * @see AC8
 */

import { z } from 'zod'

/**
 * Wishlist item with full accessibility attributes
 */
export const AccessibleWishlistItemSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high']),
  status: z.enum(['pending', 'purchased', 'archived']),
  imageUrl: z.string().url().optional(),
  imageAlt: z.string().optional(),
  price: z.number().optional(),
  ariaLabel: z.string(),
  ariaDescription: z.string().optional(),
})

export type AccessibleWishlistItem = z.infer<typeof AccessibleWishlistItemSchema>

/**
 * Sample wishlist items with complete accessibility attributes
 */
export const accessibleWishlistItems: AccessibleWishlistItem[] = [
  {
    id: '550e8400-e29b-41d4-a716-446655440001',
    name: 'LEGO Star Wars Millennium Falcon',
    description: 'Ultimate Collector Series set with 7,541 pieces',
    priority: 'high',
    status: 'pending',
    imageUrl: 'https://example.com/falcon.jpg',
    imageAlt: 'LEGO Millennium Falcon set box showing completed model',
    price: 849.99,
    ariaLabel: 'LEGO Star Wars Millennium Falcon, high priority, pending',
    ariaDescription:
      'Ultimate Collector Series set with 7,541 pieces. Price: $849.99',
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440002',
    name: 'LEGO Technic Porsche 911',
    description: 'Detailed sports car with working gearbox',
    priority: 'medium',
    status: 'pending',
    imageUrl: 'https://example.com/porsche.jpg',
    imageAlt: 'LEGO Technic Porsche 911 in orange color',
    price: 179.99,
    ariaLabel: 'LEGO Technic Porsche 911, medium priority, pending',
    ariaDescription: 'Detailed sports car with working gearbox. Price: $179.99',
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440003',
    name: 'LEGO Architecture Taj Mahal',
    description: 'Iconic landmark model with intricate details',
    priority: 'low',
    status: 'purchased',
    imageUrl: 'https://example.com/tajmahal.jpg',
    imageAlt: 'LEGO Architecture Taj Mahal white marble model',
    price: 119.99,
    ariaLabel: 'LEGO Architecture Taj Mahal, low priority, purchased',
    ariaDescription: 'Iconic landmark model with intricate details. Price: $119.99',
  },
]

/**
 * Priority options with accessible labels
 */
export const priorityOptions = [
  {
    value: 'low',
    label: 'Low Priority',
    description: 'Nice to have, not urgent',
    ariaLabel: 'Set priority to low',
  },
  {
    value: 'medium',
    label: 'Medium Priority',
    description: 'Want soon, but can wait',
    ariaLabel: 'Set priority to medium',
  },
  {
    value: 'high',
    label: 'High Priority',
    description: 'Must have, top of the list',
    ariaLabel: 'Set priority to high',
  },
] as const

/**
 * Status options with accessible labels
 */
export const statusOptions = [
  {
    value: 'pending',
    label: 'Pending',
    description: 'Not yet purchased',
    ariaLabel: 'Mark as pending',
  },
  {
    value: 'purchased',
    label: 'Purchased',
    description: 'Already bought',
    ariaLabel: 'Mark as purchased',
  },
  {
    value: 'archived',
    label: 'Archived',
    description: 'No longer needed',
    ariaLabel: 'Archive this item',
  },
] as const

/**
 * Tab navigation fixture with accessible labels
 */
export const wishlistTabs = [
  {
    id: 'tab-all',
    label: 'All Items',
    ariaLabel: 'View all wishlist items',
    panelId: 'panel-all',
  },
  {
    id: 'tab-pending',
    label: 'Pending',
    ariaLabel: 'View pending items',
    panelId: 'panel-pending',
  },
  {
    id: 'tab-purchased',
    label: 'Purchased',
    ariaLabel: 'View purchased items',
    panelId: 'panel-purchased',
  },
  {
    id: 'tab-archived',
    label: 'Archived',
    ariaLabel: 'View archived items',
    panelId: 'panel-archived',
  },
] as const

/**
 * Modal dialog fixtures with accessible labels
 */
export const modalFixtures = {
  addItem: {
    id: 'add-item-modal',
    title: 'Add New Wishlist Item',
    ariaLabel: 'Add new item to wishlist',
    ariaDescription: 'Fill in the details to add a new item to your wishlist',
    closeButtonLabel: 'Close add item dialog',
    submitButtonLabel: 'Add item to wishlist',
    cancelButtonLabel: 'Cancel adding item',
  },
  editItem: {
    id: 'edit-item-modal',
    title: 'Edit Wishlist Item',
    ariaLabel: 'Edit wishlist item',
    ariaDescription: 'Modify the details of this wishlist item',
    closeButtonLabel: 'Close edit dialog',
    submitButtonLabel: 'Save changes',
    cancelButtonLabel: 'Cancel editing',
  },
  deleteConfirm: {
    id: 'delete-confirm-modal',
    title: 'Confirm Delete',
    ariaLabel: 'Confirm item deletion',
    ariaDescription: 'Are you sure you want to delete this item? This cannot be undone.',
    closeButtonLabel: 'Close confirmation dialog',
    confirmButtonLabel: 'Delete item permanently',
    cancelButtonLabel: 'Cancel deletion',
  },
} as const

/**
 * Form field fixtures with accessible labels
 */
export const formFieldFixtures = {
  itemName: {
    id: 'item-name',
    label: 'Item Name',
    placeholder: 'Enter the name of the item',
    required: true,
    ariaDescribedBy: 'item-name-hint',
    hint: 'Enter a descriptive name for your wishlist item',
    errorId: 'item-name-error',
    errorMessage: 'Item name is required',
  },
  itemDescription: {
    id: 'item-description',
    label: 'Description',
    placeholder: 'Add details about this item',
    required: false,
    ariaDescribedBy: 'item-description-hint',
    hint: 'Optional: Add more details like model number, color, or size',
  },
  itemPrice: {
    id: 'item-price',
    label: 'Price',
    placeholder: '0.00',
    required: false,
    ariaDescribedBy: 'item-price-hint',
    hint: 'Enter the price in dollars',
    type: 'number',
    min: 0,
    step: 0.01,
  },
  itemUrl: {
    id: 'item-url',
    label: 'Link to Item',
    placeholder: 'https://',
    required: false,
    ariaDescribedBy: 'item-url-hint',
    hint: 'Add a link where this item can be purchased',
    type: 'url',
  },
  prioritySelect: {
    id: 'item-priority',
    label: 'Priority',
    required: true,
    ariaLabel: 'Select item priority',
    options: priorityOptions,
  },
} as const

/**
 * Button fixtures with accessible labels
 */
export const buttonFixtures = {
  addItem: {
    label: 'Add Item',
    ariaLabel: 'Add new item to wishlist',
    icon: 'plus',
    iconAriaHidden: true,
  },
  deleteItem: {
    label: 'Delete',
    ariaLabel: 'Delete this item from wishlist',
    icon: 'trash',
    iconAriaHidden: true,
  },
  editItem: {
    label: 'Edit',
    ariaLabel: 'Edit this item',
    icon: 'pencil',
    iconAriaHidden: true,
  },
  togglePurchased: {
    labelPending: 'Mark as Purchased',
    labelPurchased: 'Mark as Pending',
    ariaLabelPending: 'Mark this item as purchased',
    ariaLabelPurchased: 'Mark this item as not yet purchased',
  },
  sortAscending: {
    label: 'Sort Ascending',
    ariaLabel: 'Sort items from low to high',
    ariaPressed: false,
  },
  sortDescending: {
    label: 'Sort Descending',
    ariaLabel: 'Sort items from high to low',
    ariaPressed: false,
  },
} as const

/**
 * Live region messages for screen reader announcements
 */
export const liveRegionMessages = {
  itemAdded: (name: string) => `${name} added to wishlist`,
  itemDeleted: (name: string) => `${name} removed from wishlist`,
  itemUpdated: (name: string) => `${name} updated`,
  priorityChanged: (name: string, priority: string) =>
    `${name} priority changed to ${priority}`,
  statusChanged: (name: string, status: string) => `${name} marked as ${status}`,
  sortingChanged: (sortBy: string, direction: string) =>
    `Wishlist sorted by ${sortBy} in ${direction} order`,
  filterApplied: (filter: string, count: number) =>
    `Showing ${count} ${filter} items`,
  loadingComplete: (count: number) => `Loaded ${count} wishlist items`,
  errorOccurred: (message: string) => `Error: ${message}`,
  dragStarted: (name: string) => `Picked up ${name}. Use arrow keys to reorder.`,
  dragEnded: (name: string, position: number) =>
    `Dropped ${name} at position ${position}`,
} as const

/**
 * Color contrast test fixtures
 */
export const colorContrastFixtures = {
  /** Passing combinations (WCAG AA compliant) */
  passing: [
    { foreground: '#000000', background: '#FFFFFF', ratio: 21 },
    { foreground: '#1a1a1a', background: '#ffffff', ratio: 16.1 },
    { foreground: '#595959', background: '#ffffff', ratio: 7.0 },
    { foreground: '#ffffff', background: '#0056b3', ratio: 6.08 },
  ],
  /** Failing combinations (below WCAG AA 4.5:1) */
  failing: [
    { foreground: '#999999', background: '#ffffff', ratio: 2.85 },
    { foreground: '#cccccc', background: '#ffffff', ratio: 1.61 },
    { foreground: '#ffff00', background: '#ffffff', ratio: 1.07 },
    { foreground: '#ff0000', background: '#00ff00', ratio: 2.91 },
  ],
  /** Edge cases at the boundary */
  borderline: [
    { foreground: '#767676', background: '#ffffff', ratio: 4.54 }, // Just passes
    { foreground: '#777777', background: '#ffffff', ratio: 4.48 }, // Just fails
  ],
} as const

/**
 * Heading hierarchy test fixtures
 */
export const headingFixtures = {
  /** Valid hierarchy */
  valid: [
    { level: 1, text: 'My Wishlist' },
    { level: 2, text: 'High Priority Items' },
    { level: 3, text: 'LEGO Sets' },
    { level: 3, text: 'Books' },
    { level: 2, text: 'Medium Priority Items' },
  ],
  /** Invalid hierarchy (skips levels) */
  invalid: [
    { level: 1, text: 'My Wishlist' },
    { level: 3, text: 'Items' }, // Skips h2
    { level: 2, text: 'Other' },
    { level: 5, text: 'Subitem' }, // Skips h3, h4
  ],
} as const

/**
 * Factory function to create accessible wishlist item
 *
 * @param overrides - Properties to override
 * @returns Complete accessible wishlist item
 */
export function createAccessibleWishlistItem(
  overrides: Partial<AccessibleWishlistItem> = {}
): AccessibleWishlistItem {
  const base: AccessibleWishlistItem = {
    id: crypto.randomUUID?.() ?? '550e8400-e29b-41d4-a716-446655440000',
    name: 'Test Wishlist Item',
    description: 'A sample item for testing',
    priority: 'medium',
    status: 'pending',
    ariaLabel: 'Test Wishlist Item, medium priority, pending',
  }

  const merged = { ...base, ...overrides }

  // Auto-generate ariaLabel if name, priority, or status changed
  if (overrides.name || overrides.priority || overrides.status) {
    merged.ariaLabel = `${merged.name}, ${merged.priority} priority, ${merged.status}`
  }

  return AccessibleWishlistItemSchema.parse(merged)
}

/**
 * Factory function to create multiple accessible items
 *
 * @param count - Number of items to create
 * @returns Array of accessible wishlist items
 */
export function createAccessibleWishlistItems(count: number): AccessibleWishlistItem[] {
  const priorities = ['low', 'medium', 'high'] as const
  const statuses = ['pending', 'purchased', 'archived'] as const

  return Array.from({ length: count }, (_, index) =>
    createAccessibleWishlistItem({
      name: `Test Item ${index + 1}`,
      description: `Description for item ${index + 1}`,
      priority: priorities[index % priorities.length],
      status: statuses[Math.floor(index / priorities.length) % statuses.length],
    })
  )
}
