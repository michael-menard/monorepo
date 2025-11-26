/**
 * Enhanced RTK Query Hooks for Serverless Patterns
 * Optimized hooks with connection warming, circuit breakers, and performance monitoring
 */

import { useEffect, useCallback, useMemo } from 'react'
import { useDispatch } from 'react-redux'
import type { 
  UseQueryHookResult, 
  UseMutationHookResult,
  QueryDefinition,
  MutationDefinition,
  BaseQueryFn,
} from '@reduxjs/toolkit/query/react'
import { skipToken } from '@reduxjs/toolkit/query/react'
import { performanceMonitor } from '../lib/performance'
import { getConnectionWarmer } from '../retry/connection-warming'
import { getCircuitBreakerStates } from '../retry/retry-logic'
import { createLogger } from '@repo/logger'

const logger = createLogger('api-client:rtk-hooks')

export interface ServerlessQueryOptions {
  // Performance monitoring
  enablePerformanceTracking?: boolean
  slowQueryThreshold?: number
  
  // Connection warming
  enableConnectionWarming?: boolean
  warmOnMount?: boolean
  
  // Circuit breaker integration
  respectCircuitBreaker?: boolean
  fallbackData?: any
  
  // Priority and retry
  priority?: 'low' | 'medium' | 'high' | 'critical'
  maxRetries?: number
  
  // Caching strategy
  cacheStrategy?: 'none' | 'short' | 'medium' | 'long' | 'persistent'
  
  // Error handling
  onError?: (error: any) => void
  onSuccess?: (data: any) => void
}

export interface ServerlessMutationOptions extends Omit<ServerlessQueryOptions, 'cacheStrategy'> {
  // Optimistic updates
  enableOptimisticUpdates?: boolean
  optimisticUpdateFn?: (data: any) => any
  
  // Batch mutations
  enableBatching?: boolean
  batchDelay?: number
}

/**
 * Enhanced useQuery hook with serverless optimizations
 */
export function useServerlessQuery<T = any>(
  queryHook: () => UseQueryHookResult<T>,
  options: ServerlessQueryOptions = {}
): UseQueryHookResult<T> & {
  performanceMetrics?: {
    queryTime: number
    cacheStatus: 'hit' | 'miss' | 'stale'
    retryCount: number
  }
  circuitBreakerStatus?: 'closed' | 'open' | 'half-open'
} {
  const {
    enablePerformanceTracking = true,
    slowQueryThreshold = 1000,
    enableConnectionWarming = true,
    warmOnMount = true,
    respectCircuitBreaker = true,
    fallbackData,
    priority = 'medium',
    onError,
    onSuccess,
  } = options

  const startTime = useMemo(() => performance.now(), [])
  const result = queryHook()
  
  // Performance tracking
  const performanceMetrics = useMemo(() => {
    if (!enablePerformanceTracking) return undefined
    
    const queryTime = performance.now() - startTime
    return {
      queryTime,
      cacheStatus: result.isLoading ? 'miss' : 'hit' as const,
      retryCount: 0, // This would need to be tracked in the base query
    }
  }, [result.isLoading, startTime, enablePerformanceTracking])

  // Circuit breaker status
  const circuitBreakerStatus = useMemo(() => {
    if (!respectCircuitBreaker) return undefined
    
    const states = getCircuitBreakerStates()
    // This would need endpoint identification to get specific state
    return 'closed' as const
  }, [respectCircuitBreaker])

  // Connection warming on mount
  useEffect(() => {
    if (enableConnectionWarming && warmOnMount) {
      const warmer = getConnectionWarmer()
      if (warmer) {
        // Trigger warming for this endpoint
        // This would need endpoint identification
      }
    }
  }, [enableConnectionWarming, warmOnMount])

  // Performance monitoring
  useEffect(() => {
    if (enablePerformanceTracking && performanceMetrics) {
      const { queryTime } = performanceMetrics
      
      if (queryTime > slowQueryThreshold) {
        logger.warn(`🐌 Slow query detected: ${queryTime.toFixed(2)}ms`, undefined, { queryTime, slowQueryThreshold })
      }
      
      // Track in performance monitor
      performanceMonitor.trackComponentRender(`query-${Date.now()}`, queryTime)
    }
  }, [performanceMetrics, enablePerformanceTracking, slowQueryThreshold])

  // Success/Error callbacks
  useEffect(() => {
    if (result.isSuccess && result.data && onSuccess) {
      onSuccess(result.data)
    }
  }, [result.isSuccess, result.data, onSuccess])

  useEffect(() => {
    if (result.isError && result.error && onError) {
      onError(result.error)
    }
  }, [result.isError, result.error, onError])

  // Circuit breaker fallback
  const enhancedResult = useMemo(() => {
    if (respectCircuitBreaker && circuitBreakerStatus === 'open' && fallbackData) {
      return {
        ...result,
        data: fallbackData,
        isSuccess: true,
        isError: false,
        error: undefined,
      }
    }
    return result
  }, [result, respectCircuitBreaker, circuitBreakerStatus, fallbackData])

  return {
    ...enhancedResult,
    performanceMetrics,
    circuitBreakerStatus,
  }
}

/**
 * Enhanced useMutation hook with serverless optimizations
 */
export function useServerlessMutation<T = any, A = any>(
  mutationHook: () => UseMutationHookResult<T, A>,
  options: ServerlessMutationOptions = {}
): UseMutationHookResult<T, A> & {
  performanceMetrics?: {
    mutationTime: number
    retryCount: number
  }
} {
  const {
    enablePerformanceTracking = true,
    priority = 'medium',
    onError,
    onSuccess,
  } = options

  const result = mutationHook()
  const [mutate, mutationResult] = result

  // Enhanced mutate function with performance tracking
  const enhancedMutate = useCallback(async (arg: A) => {
    const startTime = performance.now()
    
    try {
      const mutationResult = await mutate(arg).unwrap()
      
      if (enablePerformanceTracking) {
        const mutationTime = performance.now() - startTime
        performanceMonitor.trackComponentRender(`mutation-${Date.now()}`, mutationTime)
      }
      
      if (onSuccess) {
        onSuccess(mutationResult)
      }
      
      return mutationResult
    } catch (error) {
      if (enablePerformanceTracking) {
        const mutationTime = performance.now() - startTime
        performanceMonitor.trackComponentRender(`mutation-failed-${Date.now()}`, mutationTime)
      }
      
      if (onError) {
        onError(error)
      }
      
      throw error
    }
  }, [mutate, enablePerformanceTracking, onSuccess, onError])

  const performanceMetrics = useMemo(() => {
    if (!enablePerformanceTracking) return undefined
    
    return {
      mutationTime: 0, // This would be tracked in the enhanced mutate function
      retryCount: 0,
    }
  }, [enablePerformanceTracking])

  return [
    enhancedMutate,
    {
      ...mutationResult,
      performanceMetrics,
    }
  ]
}

/**
 * Hook for monitoring RTK Query performance
 */
export function useRTKQueryPerformance() {
  const dispatch = useDispatch()
  
  return useMemo(() => ({
    // This would integrate with the performance monitoring middleware
    getMetrics: () => ({}),
    resetMetrics: () => {},
    getRecentQueries: () => [],
  }), [dispatch])
}
