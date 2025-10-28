// React Query hooks that adapt to different environments
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient, API_ENDPOINTS, getRetryConfig } from '../services/apiClient'
import { isDevelopment } from '../config/environment'

/**
 * Query Keys - Centralized and consistent
 */
export const QUERY_KEYS = {
  // Auth queries
  auth: {
    profile: ['auth', 'profile'] as const,
    session: ['auth', 'session'] as const,
  },

  // MOC queries
  mocs: {
    all: ['mocs'] as const,
    list: (filters?: any) => ['mocs', 'list', filters] as const,
    detail: (id: string) => ['mocs', 'detail', id] as const,
    files: (id: string) => ['mocs', 'files', id] as const,
  },

  // Sets queries
  sets: {
    all: ['sets'] as const,
    list: (filters?: any) => ['sets', 'list', filters] as const,
    detail: (id: string) => ['sets', 'detail', id] as const,
    search: (query: string) => ['sets', 'search', query] as const,
  },

  // Instructions queries
  instructions: {
    all: ['instructions'] as const,
    list: (filters?: any) => ['instructions', 'list', filters] as const,
    detail: (id: string) => ['instructions', 'detail', id] as const,
  },

  // Wishlist queries
  wishlist: {
    all: ['wishlist'] as const,
    list: () => ['wishlist', 'list'] as const,
  },

  // Search queries
  search: {
    global: (query: string) => ['search', 'global', query] as const,
    mocs: (query: string) => ['search', 'mocs', query] as const,
    sets: (query: string) => ['search', 'sets', query] as const,
  },
} as const

/**
 * Environment-aware fetch function
 */
const fetchWithConfig = async (url: string, options?: RequestInit) => {
  const config = {
    ...apiClient.getFetchConfig(),
    ...options,
  }

  const response = await fetch(url, config)

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Auth Hooks
 */
export const useAuthProfile = () => {
  return useQuery({
    queryKey: QUERY_KEYS.auth.profile,
    queryFn: () => fetchWithConfig(API_ENDPOINTS.auth.profile()),
    retry: getRetryConfig().attempts,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })
}

export const useLogin = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (credentials: { email: string; password: string }) =>
      fetchWithConfig(API_ENDPOINTS.auth.login(), {
        method: 'POST',
        body: JSON.stringify(credentials),
      }),
    onSuccess: () => {
      // Invalidate auth queries on successful login
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.auth.profile })
    },
    onError: () => {
      if (isDevelopment) {
        // Error logging removed
      }
    },
  })
}

export const useLogout = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => fetchWithConfig(API_ENDPOINTS.auth.logout(), { method: 'POST' }),
    onSuccess: () => {
      // Clear all queries on logout
      queryClient.clear()
    },
  })
}

/**
 * MOC Hooks
 */
export const useMocs = (filters?: any) => {
  return useQuery({
    queryKey: QUERY_KEYS.mocs.list(filters),
    queryFn: () => {
      const url = new URL(API_ENDPOINTS.lego.mocs.list())
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            url.searchParams.append(key, String(value))
          }
        })
      }
      return fetchWithConfig(url.toString())
    },
    retry: getRetryConfig().attempts,
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}

export const useMoc = (id: string) => {
  return useQuery({
    queryKey: QUERY_KEYS.mocs.detail(id),
    queryFn: () => fetchWithConfig(API_ENDPOINTS.lego.mocs.get(id)),
    enabled: !!id,
    retry: getRetryConfig().attempts,
  })
}

export const useCreateMoc = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (mocData: any) =>
      fetchWithConfig(API_ENDPOINTS.lego.mocs.create(), {
        method: 'POST',
        body: JSON.stringify(mocData),
      }),
    onSuccess: () => {
      // Invalidate MOC list queries
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.mocs.all })
    },
    onError: () => {
      if (isDevelopment) {
        // Error logging removed
      }
    },
  })
}

export const useUpdateMoc = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      fetchWithConfig(API_ENDPOINTS.lego.mocs.update(id), {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: (_, { id }) => {
      // Invalidate specific MOC and list queries
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.mocs.detail(id) })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.mocs.all })
    },
  })
}

export const useDeleteMoc = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) =>
      fetchWithConfig(API_ENDPOINTS.lego.mocs.delete(id), { method: 'DELETE' }),
    onSuccess: (_, id) => {
      // Remove from cache and invalidate list
      queryClient.removeQueries({ queryKey: QUERY_KEYS.mocs.detail(id) })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.mocs.all })
    },
  })
}

/**
 * Search Hooks
 */
export const useGlobalSearch = (query: string, enabled = true) => {
  return useQuery({
    queryKey: QUERY_KEYS.search.global(query),
    queryFn: () => {
      const url = new URL(API_ENDPOINTS.lego.search.global())
      url.searchParams.append('q', query)
      return fetchWithConfig(url.toString())
    },
    enabled: enabled && query.length > 2, // Only search if query is long enough
    staleTime: 30 * 1000, // 30 seconds
    retry: 1, // Fewer retries for search
  })
}

/**
 * Wishlist Hooks
 */
export const useWishlist = () => {
  return useQuery({
    queryKey: QUERY_KEYS.wishlist.list(),
    queryFn: () => fetchWithConfig(API_ENDPOINTS.lego.wishlist.list()),
    retry: getRetryConfig().attempts,
  })
}

export const useAddToWishlist = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (item: any) =>
      fetchWithConfig(API_ENDPOINTS.lego.wishlist.add(), {
        method: 'POST',
        body: JSON.stringify(item),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.wishlist.all })
    },
  })
}

export const useRemoveFromWishlist = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) =>
      fetchWithConfig(API_ENDPOINTS.lego.wishlist.remove(id), { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.wishlist.all })
    },
  })
}

/**
 * File Upload Hook
 */
export const useFileUpload = () => {
  return useMutation({
    mutationFn: ({ file, mocId }: { file: File; mocId?: string }) => {
      const formData = new FormData()
      formData.append('file', file)
      if (mocId) {
        formData.append('mocId', mocId)
      }

      return fetchWithConfig(API_ENDPOINTS.lego.upload.single(), {
        method: 'POST',
        body: formData,
        headers: {}, // Let browser set Content-Type for FormData
      })
    },
    onError: () => {
      if (isDevelopment) {
        // Error logging removed
      }
    },
  })
}

/**
 * Health Check Hook (useful for monitoring)
 */
export const useHealthCheck = () => {
  return useQuery({
    queryKey: ['health'],
    queryFn: () => fetchWithConfig(API_ENDPOINTS.lego.health()),
    refetchInterval: isDevelopment ? false : 5 * 60 * 1000, // 5 minutes in production
    retry: 1,
    staleTime: 60 * 1000, // 1 minute
  })
}
