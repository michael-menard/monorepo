/**
 * Enhanced Wishlist API Usage Examples
 * Demonstrates how to use the enhanced serverless Wishlist API with all optimizations
 */

import { useState, useEffect, useCallback } from 'react'
import {
  useEnhancedWishlistQueryQuery,
  useEnhancedBatchWishlistOperationMutation,
  useGetEnhancedPriceEstimatesQuery,
  useGetEnhancedWishlistStatsQuery,
  useManagePriceAlertsMutation,
  type EnhancedWishlistParams,
} from './wishlist-api'

/**
 * Example 1: Advanced Wishlist Query with LEGO-Specific Filtering
 */
export function useAdvancedWishlistQuery() {
  const wishlistParams: EnhancedWishlistParams = {
    // Basic filtering
    priority: 'high',
    category: 'lego-sets',
    tags: ['technic', 'creator'],

    // LEGO-specific filters
    themes: ['Technic', 'Creator Expert', 'Architecture'],
    setNumbers: ['42143', '10294', '21058'],
    availability: ['available', 'upcoming'],
    condition: ['new', 'sealed'],

    // Advanced wishlist features
    priorityLevels: ['high', 'urgent'],
    wishlistCategories: ['birthday-gifts', 'personal-collection'],
    priceAlerts: true, // Only items with price alerts
    giftIdeas: false,
    seasonalItems: ['holiday', 'birthday'],

    // Price and cost filtering
    costRange: { min: 50, max: 500 },
    partCountRange: { min: 500, max: 3000 },

    // Status filters
    isPurchased: false,
    isWatching: true, // Watching for price drops
    hasNotes: true,
    hasEstimatedCost: true,

    // Search and discovery
    query: 'modular building',
    similarItems: true, // Include similar item suggestions
    priceComparison: true, // Include price comparison data

    // Pagination and sorting
    page: 1,
    limit: 25,
    sortBy: 'priority',
    sortOrder: 'desc',

    // Performance optimizations
    includeMetadata: true,
    includePriceHistory: true,
    includeAvailability: true,
    cacheStrategy: 'medium',
    enableBatchLoading: true,
    prefetchRelated: true, // Prefetch related/similar items
  }

  const { data, isLoading, isFetching, error, refetch } = useEnhancedWishlistQueryQuery(
    wishlistParams,
    {
      // RTK Query options with serverless optimizations
      refetchOnMountOrArgChange: 300, // 5 minutes
      refetchOnFocus: false,
      refetchOnReconnect: true,
    },
  )

  return {
    items: data?.data.items || [],
    pagination: data?.pagination,
    totalCount: data?.data.totalCount || 0,
    totalValue: data?.data.totalValue || 0,
    highPriorityCount: data?.data.items.filter(item => item.priority === 'high').length,
    isLoading,
    isFetching,
    error,
    refetch,
  }
}

/**
 * Example 2: Batch Wishlist Operations with Optimistic Updates
 */
export function useWishlistBatchOperations() {
  const [batchOperation, { isLoading, error }] = useEnhancedBatchWishlistOperationMutation()

  const batchDeleteItems = async (itemIds: string[]) => {
    return batchOperation({
      operation: 'delete',
      itemIds,
    }).unwrap()
  }

  const batchUpdatePriority = async (itemIds: string[], priority: 'low' | 'medium' | 'high') => {
    return batchOperation({
      operation: 'updatePriority',
      itemIds,
      data: { priority },
    }).unwrap()
  }

  const batchUpdateCategory = async (itemIds: string[], category: string) => {
    return batchOperation({
      operation: 'updateCategory',
      itemIds,
      data: { category },
    }).unwrap()
  }

  const batchArchiveItems = async (itemIds: string[]) => {
    return batchOperation({
      operation: 'archive',
      itemIds,
      data: { archived: true },
    }).unwrap()
  }

  return {
    batchDeleteItems,
    batchUpdatePriority,
    batchUpdateCategory,
    batchArchiveItems,
    isLoading,
    error,
  }
}

/**
 * Example 3: Price Tracking and Alerts Management
 */
export function usePriceTrackingAndAlerts(itemIds: string[]) {
  const [managePriceAlerts, { isLoading: isManaging }] = useManagePriceAlertsMutation()

  const {
    data: priceData,
    isLoading: isPriceLoading,
    error: priceError,
    refetch: refetchPrices,
  } = useGetEnhancedPriceEstimatesQuery(itemIds, {
    skip: itemIds.length === 0,
    // Price data changes frequently, refetch more often
    refetchOnMountOrArgChange: 60, // 1 minute
  })

  const enablePriceAlerts = async (alertThreshold: number) => {
    return managePriceAlerts({
      itemIds,
      operation: 'enable',
      alertThreshold,
    }).unwrap()
  }

  const disablePriceAlerts = async () => {
    return managePriceAlerts({
      itemIds,
      operation: 'disable',
    }).unwrap()
  }

  const updateAlertThreshold = async (alertThreshold: number) => {
    return managePriceAlerts({
      itemIds,
      operation: 'update',
      alertThreshold,
    }).unwrap()
  }

  return {
    priceEstimates: priceData?.data || [],
    totalValue: priceData?.data?.totalValue || 0,
    averagePrice: priceData?.data?.averagePrice || 0,
    priceHistory: priceData?.data?.priceHistory || [],
    isPriceLoading,
    priceError,
    refetchPrices,
    enablePriceAlerts,
    disablePriceAlerts,
    updateAlertThreshold,
    isManaging,
  }
}

/**
 * Example 4: Wishlist Statistics and Analytics
 */
export function useWishlistAnalytics() {
  const { data, isLoading, error, refetch } = useGetEnhancedWishlistStatsQuery(undefined, {
    // Statistics don't change often, use longer cache
    refetchOnMountOrArgChange: 1800, // 30 minutes
    refetchOnFocus: false,
    refetchOnReconnect: false,
  })

  return {
    stats: data?.data,
    totalItems: data?.data?.totalItems || 0,
    totalValue: data?.data?.totalValue || 0,
    averageItemValue: data?.data?.averageItemValue || 0,
    highPriorityItems: data?.data?.highPriorityItems || 0,
    itemsByCategory: data?.data?.itemsByCategory || {},
    itemsByTheme: data?.data?.itemsByTheme || {},
    priceAlertItems: data?.data?.priceAlertItems || 0,
    recentlyAdded: data?.data?.recentlyAdded || 0,
    purchasedItems: data?.data?.purchasedItems || 0,
    wishlistGrowth: data?.data?.wishlistGrowth || [],
    topCategories: data?.data?.topCategories || [],
    isLoading,
    error,
    refetch,
  }
}

/**
 * Example 5: Smart Wishlist with Auto-Categorization
 */
export function useSmartWishlist(baseParams: Partial<EnhancedWishlistParams>) {
  const [activeFilters, setActiveFilters] = useState(baseParams)
  const [smartSuggestions, setSmartSuggestions] = useState<any[]>([])

  const wishlistParams = {
    ...activeFilters,
    similarItems: true,
    priceComparison: true,
    includeMetadata: true,
    cacheStrategy: 'medium' as const,
  }

  const { data, isLoading, isFetching } = useEnhancedWishlistQueryQuery(wishlistParams)

  // Smart categorization based on item analysis
  useEffect(() => {
    if (data?.data.items) {
      const suggestions = analyzeWishlistItems(data.data.items)
      setSmartSuggestions(suggestions)
    }
  }, [data])

  const applySmartFilter = useCallback((filterType: string, value: any) => {
    setActiveFilters(prev => ({
      ...prev,
      [filterType]: value,
    }))
  }, [])

  const resetFilters = useCallback(() => {
    setActiveFilters(baseParams)
  }, [baseParams])

  return {
    items: data?.data.items || [],
    smartSuggestions,
    activeFilters,
    totalValue: data?.data.items?.reduce((sum, item) => sum + (item.estimatedCost || 0), 0) || 0,
    categoryBreakdown: getCategoryBreakdown(data?.data.items || []),
    priorityBreakdown: getPriorityBreakdown(data?.data.items || []),
    isLoading: isLoading,
    isRefreshing: isFetching && !isLoading,
    applySmartFilter,
    resetFilters,
  }
}

// Helper functions for smart analysis
function analyzeWishlistItems(items: any[]) {
  const suggestions = []

  // Analyze spending patterns
  const highValueItems = items.filter(item => (item.estimatedCost || 0) > 200)
  if (highValueItems.length > 5) {
    suggestions.push({
      type: 'spending',
      message: `You have ${highValueItems.length} high-value items. Consider setting price alerts.`,
      action: 'enable_price_alerts',
      items: highValueItems.map(item => item.id),
    })
  }

  // Analyze theme preferences
  const themeCount = items.reduce(
    (acc, item) => {
      item.themes?.forEach((theme: string) => {
        acc[theme] = (acc[theme] || 0) + 1
      })
      return acc
    },
    {} as Record<string, number>,
  )

  const topTheme = Object.entries(themeCount).sort(([, a], [, b]) => b - a)[0]
  if (topTheme && topTheme[1] > 3) {
    suggestions.push({
      type: 'theme',
      message: `You love ${topTheme[0]} sets! Check out similar items.`,
      action: 'explore_theme',
      theme: topTheme[0],
    })
  }

  return suggestions
}

function getCategoryBreakdown(items: any[]) {
  return items.reduce(
    (acc, item) => {
      const category = item.category || 'Uncategorized'
      acc[category] = (acc[category] || 0) + 1
      return acc
    },
    {} as Record<string, number>,
  )
}

function getPriorityBreakdown(items: any[]) {
  return items.reduce(
    (acc, item) => {
      const priority = item.priority || 'medium'
      acc[priority] = (acc[priority] || 0) + 1
      return acc
    },
    {} as Record<string, number>,
  )
}
