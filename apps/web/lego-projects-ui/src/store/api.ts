/**
 * Base RTK Query API Slice
 * Provides a foundation for all API endpoints in the app
 */
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { config } from '@/config/env'

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl: config.api.baseUrl,
    prepareHeaders: (headers, { getState }) => {
      // Optionally add auth token from state
      const state = getState() as any
      const token = state?.auth?.token
      if (token) {
        headers.set('authorization', `Bearer ${token}`)
      }
      return headers
    },
  }),
  tagTypes: ['User', 'LegoSet', 'Auth', 'Collection', 'Wishlist', 'MOC'],
  endpoints: () => ({}),
})

export default baseApi 