import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import type { PortHealthResponse, PortHistoryResponse, TopologyResponse } from './__types__'

export const portMonitorApi = createApi({
  reducerPath: 'portMonitorApi',
  baseQuery: fetchBaseQuery({ baseUrl: '/api/v1' }),
  tagTypes: ['PortHealth'],
  endpoints: builder => ({
    getPortHealth: builder.query<PortHealthResponse, void>({
      query: () => '/ports/health',
      providesTags: ['PortHealth'],
    }),
    getPortHistory: builder.query<PortHistoryResponse, void>({
      query: () => '/ports/history',
    }),
    getPortTopology: builder.query<TopologyResponse, void>({
      query: () => '/ports/topology',
    }),
    stopService: builder.mutation<{ success: boolean; message: string }, string>({
      query: key => ({ url: `/ports/${key}/stop`, method: 'POST' }),
      invalidatesTags: ['PortHealth'],
    }),
    startService: builder.mutation<{ success: boolean; message: string }, string>({
      query: key => ({ url: `/ports/${key}/start`, method: 'POST' }),
      invalidatesTags: ['PortHealth'],
    }),
    restartService: builder.mutation<{ success: boolean; message: string }, string>({
      query: key => ({ url: `/ports/${key}/restart`, method: 'POST' }),
      invalidatesTags: ['PortHealth'],
    }),
  }),
})

export const {
  useGetPortHealthQuery,
  useGetPortHistoryQuery,
  useGetPortTopologyQuery,
  useStopServiceMutation,
  useStartServiceMutation,
  useRestartServiceMutation,
} = portMonitorApi
