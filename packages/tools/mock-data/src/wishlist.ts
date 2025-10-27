/**
 * Wishlist item type definition
 */
export interface WishlistItem {
  id: string
  name: string
  description?: string
  price: number
  url: string
  imageUrl: string
  priority: 'low' | 'medium' | 'high'
  category?: string
  isPurchased: boolean
  createdAt: Date
  updatedAt: Date
}

/**
 * Mock wishlist items for development and testing
 */
export const mockWishlistItems: WishlistItem[] = [
  {
    id: '1',
    name: 'Millennium Falcon',
    description:
      'The ultimate collector series Millennium Falcon with incredible detail and features.',
    price: 849.99,
    url: 'https://www.lego.com/en-us/product/millennium-falcon-75257',
    imageUrl: '/images/sets/millennium-falcon.jpg',
    priority: 'high',
    category: 'Star Wars',
    isPurchased: false,
    createdAt: new Date('2024-01-15T10:00:00Z'),
    updatedAt: new Date('2024-01-15T10:00:00Z'),
  },
  {
    id: '2',
    name: 'Hogwarts Castle',
    description: 'Massive Hogwarts Castle with detailed interiors and minifigures.',
    price: 469.99,
    url: 'https://www.lego.com/en-us/product/hogwarts-castle-71043',
    imageUrl: '/images/sets/hogwarts-castle.jpg',
    priority: 'high',
    category: 'Harry Potter',
    isPurchased: false,
    createdAt: new Date('2024-01-10T14:30:00Z'),
    updatedAt: new Date('2024-01-10T14:30:00Z'),
  },
  {
    id: '3',
    name: 'Creator Expert Big Ben',
    description: 'Iconic Big Ben clock tower with intricate architectural details.',
    price: 249.99,
    url: 'https://www.lego.com/en-us/product/big-ben-10253',
    imageUrl: '/images/sets/big-ben.jpg',
    priority: 'medium',
    category: 'Architecture',
    isPurchased: true,
    createdAt: new Date('2023-12-20T09:15:00Z'),
    updatedAt: new Date('2024-01-05T16:45:00Z'),
  },
  {
    id: '4',
    name: 'Technic Bugatti Chiron',
    description: 'Highly detailed Bugatti Chiron with working 8-speed gearbox.',
    price: 379.99,
    url: 'https://www.lego.com/en-us/product/bugatti-chiron-42083',
    imageUrl: '/images/sets/bugatti-chiron.jpg',
    priority: 'high',
    category: 'Technic',
    isPurchased: false,
    createdAt: new Date('2024-01-08T11:20:00Z'),
    updatedAt: new Date('2024-01-08T11:20:00Z'),
  },
  {
    id: '5',
    name: 'Creator Expert Taj Mahal',
    description: 'Stunning recreation of the Taj Mahal with over 5,900 pieces.',
    price: 369.99,
    url: 'https://www.lego.com/en-us/product/taj-mahal-10256',
    imageUrl: '/images/sets/taj-mahal.jpg',
    priority: 'medium',
    category: 'Architecture',
    isPurchased: false,
    createdAt: new Date('2023-11-25T13:45:00Z'),
    updatedAt: new Date('2023-11-25T13:45:00Z'),
  },
  {
    id: '6',
    name: 'Friends Central Perk',
    description: 'Recreate iconic scenes from Friends with this detailed Central Perk set.',
    price: 59.99,
    url: 'https://www.lego.com/en-us/product/central-perk-21319',
    imageUrl: '/images/sets/central-perk.jpg',
    priority: 'low',
    category: 'Ideas',
    isPurchased: true,
    createdAt: new Date('2023-10-15T08:30:00Z'),
    updatedAt: new Date('2023-12-01T12:00:00Z'),
  },
  {
    id: '7',
    name: 'NASA Apollo Saturn V',
    description: 'Impressive 1 meter tall model of the legendary Apollo Saturn V rocket.',
    price: 119.99,
    url: 'https://www.lego.com/en-us/product/nasa-apollo-saturn-v-92176',
    imageUrl: '/images/sets/saturn-v.jpg',
    priority: 'medium',
    category: 'Ideas',
    isPurchased: false,
    createdAt: new Date('2024-01-12T15:20:00Z'),
    updatedAt: new Date('2024-01-12T15:20:00Z'),
  },
  {
    id: '8',
    name: 'Creator Expert London Bus',
    description: 'Classic red London double-decker bus with detailed interior.',
    price: 89.99,
    url: 'https://www.lego.com/en-us/product/london-bus-10258',
    imageUrl: '/images/sets/london-bus.jpg',
    priority: 'low',
    category: 'Creator Expert',
    isPurchased: false,
    createdAt: new Date('2023-12-05T10:45:00Z'),
    updatedAt: new Date('2023-12-05T10:45:00Z'),
  },
]

/**
 * Get wishlist items by category
 */
export const getWishlistItemsByCategory = (category: string): WishlistItem[] => {
  return mockWishlistItems.filter(item => item.category === category)
}

/**
 * Get wishlist items by priority
 */
export const getWishlistItemsByPriority = (priority: 'low' | 'medium' | 'high'): WishlistItem[] => {
  return mockWishlistItems.filter(item => item.priority === priority)
}

/**
 * Get purchased wishlist items
 */
export const getPurchasedWishlistItems = (): WishlistItem[] => {
  return mockWishlistItems.filter(item => item.isPurchased)
}

/**
 * Get unpurchased wishlist items
 */
export const getUnpurchasedWishlistItems = (): WishlistItem[] => {
  return mockWishlistItems.filter(item => !item.isPurchased)
}

/**
 * Get wishlist categories
 */
export const getWishlistCategories = (): string[] => {
  return Array.from(
    new Set(
      mockWishlistItems
        .map(item => item.category)
        .filter((category): category is string => Boolean(category)),
    ),
  )
}

/**
 * Get wishlist stats
 */
export const getWishlistStats = () => {
  const total = mockWishlistItems.length
  const purchased = getPurchasedWishlistItems().length
  const unpurchased = getUnpurchasedWishlistItems().length
  const totalValue = mockWishlistItems.reduce((sum, item) => sum + item.price, 0)
  const purchasedValue = getPurchasedWishlistItems().reduce((sum, item) => sum + item.price, 0)
  const unpurchasedValue = getUnpurchasedWishlistItems().reduce((sum, item) => sum + item.price, 0)

  return {
    total,
    purchased,
    unpurchased,
    totalValue,
    purchasedValue,
    unpurchasedValue,
    categories: getWishlistCategories().length,
  }
}
