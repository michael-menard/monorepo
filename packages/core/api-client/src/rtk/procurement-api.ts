/**
 * Procurement API
 *
 * RTK Query endpoints for parts procurement operations.
 * Phase 1: Parts aggregation, inventory, pricing.
 */

import { createApi } from '@reduxjs/toolkit/query/react'
import {
  ProcurementSummarySchema,
  PartsNeededResponseSchema,
  InventoryResponseSchema,
  PricedPartsResponseSchema,
  FetchPricesResponseSchema,
  WantToBuildResponseSchema,
  type ProcurementSummary,
  type PartsNeededResponse,
  type InventoryResponse,
  type PricedPartsResponse,
  type FetchPricesResponse,
  type WantToBuildResponse,
} from '../schemas/procurement'
import { createServerlessBaseQuery, getServerlessCacheConfig } from './base-query'

export const procurementApi = createApi({
  reducerPath: 'procurementApi',
  baseQuery: createServerlessBaseQuery({
    enablePerformanceMonitoring: true,
    enableJwtAuth: true,
  }),
  tagTypes: ['ProcurementSummary', 'PartsNeeded', 'Inventory', 'Prices', 'WantToBuild'],
  endpoints: builder => ({
    /**
     * GET /procurement/summary — aggregate stats
     */
    getProcurementSummary: builder.query<ProcurementSummary, void>({
      query: () => '/procurement/summary',
      transformResponse: (response: unknown) => ProcurementSummarySchema.parse(response),
      providesTags: ['ProcurementSummary'],
      ...getServerlessCacheConfig('short'),
    }),

    /**
     * GET /procurement/parts-needed — aggregated parts minus inventory
     */
    getPartsNeeded: builder.query<PartsNeededResponse, void>({
      query: () => '/procurement/parts-needed',
      transformResponse: (response: unknown) => PartsNeededResponseSchema.parse(response),
      providesTags: ['PartsNeeded'],
      ...getServerlessCacheConfig('medium'),
    }),

    /**
     * GET /procurement/inventory-available — available inventory parts
     */
    getInventoryAvailable: builder.query<InventoryResponse, void>({
      query: () => '/procurement/inventory-available',
      transformResponse: (response: unknown) => InventoryResponseSchema.parse(response),
      providesTags: ['Inventory'],
      ...getServerlessCacheConfig('medium'),
    }),

    /**
     * GET /procurement/prices — cached pricing with freshness
     */
    getPricedParts: builder.query<PricedPartsResponse, void>({
      query: () => '/procurement/prices',
      transformResponse: (response: unknown) => PricedPartsResponseSchema.parse(response),
      providesTags: ['Prices'],
      ...getServerlessCacheConfig('medium'),
    }),

    /**
     * POST /procurement/fetch-prices — trigger scraper
     */
    fetchPrices: builder.mutation<FetchPricesResponse, void>({
      query: () => ({
        url: '/procurement/fetch-prices',
        method: 'POST',
      }),
      transformResponse: (response: unknown) => FetchPricesResponseSchema.parse(response),
      invalidatesTags: ['Prices', 'ProcurementSummary'],
    }),

    /**
     * PATCH /procurement/mocs/:id/want-to-build — toggle flag
     */
    toggleWantToBuild: builder.mutation<
      WantToBuildResponse,
      { mocId: string; wantToBuild: boolean }
    >({
      query: ({ mocId, wantToBuild }) => ({
        url: `/procurement/mocs/${mocId}/want-to-build`,
        method: 'PATCH',
        body: { wantToBuild },
      }),
      transformResponse: (response: unknown) => WantToBuildResponseSchema.parse(response),
      invalidatesTags: ['ProcurementSummary', 'PartsNeeded', 'WantToBuild'],
    }),
  }),
})

export const {
  useGetProcurementSummaryQuery,
  useGetPartsNeededQuery,
  useGetInventoryAvailableQuery,
  useGetPricedPartsQuery,
  useFetchPricesMutation,
  useToggleWantToBuildMutation,
} = procurementApi

export {
  type ProcurementSummary,
  type PartsNeededResponse,
  type InventoryResponse,
  type PricedPartsResponse,
  type FetchPricesResponse,
  type WantToBuildResponse,
} from '../schemas/procurement'
