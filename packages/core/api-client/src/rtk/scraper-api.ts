/**
 * Scraper Queue API
 *
 * RTK Query endpoints for managing scrape jobs and queue health.
 */

import { createApi } from '@reduxjs/toolkit/query/react'
import { createServerlessBaseQuery } from './base-query'
import type { ScrapeJob, QueueHealth, ScraperType } from '../schemas/scraper'

interface JobListResponse {
  jobs: ScrapeJob[]
}

interface QueueHealthResponse {
  queues: QueueHealth[]
}

interface AddJobInput {
  url: string
  type?: ScraperType
  wishlist?: boolean
  resume?: boolean
  force?: boolean
  retryFailed?: boolean
  retryMissing?: boolean
  likedMocs?: boolean
}

interface AddJobResponse {
  id: string
  type: string
  status: string
  data: Record<string, unknown>
}

export const scraperApi = createApi({
  reducerPath: 'scraperApi',
  baseQuery: createServerlessBaseQuery({
    enablePerformanceMonitoring: true,
  }),
  tagTypes: ['ScraperJobs', 'ScraperQueues'],
  endpoints: builder => ({
    /**
     * POST /scraper/jobs — Add a job to the queue
     */
    addScrapeJob: builder.mutation<AddJobResponse, AddJobInput>({
      query: body => ({
        url: '/scraper/jobs',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['ScraperJobs', 'ScraperQueues'],
    }),

    /**
     * GET /scraper/jobs — List jobs
     */
    getScrapeJobs: builder.query<
      JobListResponse,
      { status?: string; type?: ScraperType; limit?: number } | void
    >({
      query: params => ({
        url: '/scraper/jobs',
        params: params || undefined,
      }),
      providesTags: ['ScraperJobs'],
    }),

    /**
     * GET /scraper/jobs/:id — Get single job detail
     */
    getScrapeJobById: builder.query<ScrapeJob, string>({
      query: id => ({ url: `/scraper/jobs/${id}` }),
      providesTags: (_result, _error, id) => [{ type: 'ScraperJobs', id }],
    }),

    /**
     * DELETE /scraper/jobs/:id — Cancel/remove a job
     */
    cancelScrapeJob: builder.mutation<{ success: boolean }, string>({
      query: id => ({
        url: `/scraper/jobs/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['ScraperJobs', 'ScraperQueues'],
    }),

    /**
     * POST /scraper/jobs/:id/retry — Retry a failed job
     */
    retryScrapeJob: builder.mutation<{ success: boolean; status: string }, string>({
      query: id => ({
        url: `/scraper/jobs/${id}/retry`,
        method: 'POST',
      }),
      invalidatesTags: ['ScraperJobs', 'ScraperQueues'],
    }),

    /**
     * GET /scraper/queues — Queue health + circuit breaker status
     */
    getQueueHealth: builder.query<QueueHealthResponse, void>({
      query: () => ({ url: '/scraper/queues' }),
      providesTags: ['ScraperQueues'],
    }),
  }),
})

export const {
  useAddScrapeJobMutation,
  useGetScrapeJobsQuery,
  useGetScrapeJobByIdQuery,
  useCancelScrapeJobMutation,
  useRetryScrapeJobMutation,
  useGetQueueHealthQuery,
} = scraperApi
