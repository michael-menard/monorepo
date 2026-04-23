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
     * Optimistic update: removes the job from cache immediately.
     */
    cancelScrapeJob: builder.mutation<{ success: boolean }, string>({
      query: id => ({
        url: `/scraper/jobs/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['ScraperQueues'],
      async onQueryStarted(id, { dispatch, queryFulfilled, getState }) {
        // Patch all cached getScrapeJobs queries to remove this job
        const patches = scraperApi.util
          .selectInvalidatedBy(getState(), ['ScraperJobs'])
          .map(({ endpointName, originalArgs }) => {
            if (endpointName !== 'getScrapeJobs') return null
            return dispatch(
              scraperApi.util.updateQueryData('getScrapeJobs', originalArgs, draft => {
                draft.jobs = draft.jobs.filter(j => j.id !== id)
              }),
            )
          })
          .filter(Boolean)

        try {
          await queryFulfilled
        } catch (err) {
          // 404 means job is already gone — keep the optimistic removal
          const is404 = (err as any)?.error?.status === 404
          if (!is404) {
            patches.forEach(p => p?.undo())
          }
        }
      },
    }),

    /**
     * DELETE /scraper/jobs?status=... — Clear all jobs with a given status
     * Optimistic update: removes matching jobs from cache immediately.
     */
    clearJobsByStatus: builder.mutation<{ success: boolean; removed: number }, string>({
      query: status => ({
        url: `/scraper/jobs?status=${status}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['ScraperQueues'],
      async onQueryStarted(status, { dispatch, queryFulfilled, getState }) {
        const patches = scraperApi.util
          .selectInvalidatedBy(getState(), ['ScraperJobs'])
          .map(({ endpointName, originalArgs }) => {
            if (endpointName !== 'getScrapeJobs') return null
            return dispatch(
              scraperApi.util.updateQueryData('getScrapeJobs', originalArgs, draft => {
                draft.jobs = draft.jobs.filter(j => j.status !== status)
              }),
            )
          })
          .filter(Boolean)

        try {
          await queryFulfilled
        } catch {
          patches.forEach(p => p?.undo())
        }
      },
    }),

    /**
     * POST /scraper/jobs/:id/retry — Retry a failed job
     * Optimistic update: moves job to waiting status immediately.
     */
    retryScrapeJob: builder.mutation<{ success: boolean; status: string }, string>({
      query: id => ({
        url: `/scraper/jobs/${id}/retry`,
        method: 'POST',
      }),
      invalidatesTags: ['ScraperQueues'],
      async onQueryStarted(id, { dispatch, queryFulfilled, getState }) {
        const patches = scraperApi.util
          .selectInvalidatedBy(getState(), ['ScraperJobs'])
          .map(({ endpointName, originalArgs }) => {
            if (endpointName !== 'getScrapeJobs') return null
            return dispatch(
              scraperApi.util.updateQueryData('getScrapeJobs', originalArgs, draft => {
                const job = draft.jobs.find(j => j.id === id)
                if (job) {
                  job.status = 'waiting'
                  job.failedReason = null
                  job.attemptsMade = 0
                }
              }),
            )
          })
          .filter(Boolean)

        try {
          await queryFulfilled
        } catch {
          patches.forEach(p => p?.undo())
        }
      },
    }),

    /**
     * GET /scraper/queues — Queue health + circuit breaker status
     */
    getQueueHealth: builder.query<QueueHealthResponse, void>({
      query: () => ({ url: '/scraper/queues' }),
      providesTags: ['ScraperQueues'],
    }),

    /**
     * POST /scraper/queues/:name/pause — Pause a single queue
     */
    pauseQueue: builder.mutation<{ success: boolean; queue: string; isPaused: boolean }, string>({
      query: name => ({
        url: `/scraper/queues/${name}/pause`,
        method: 'POST',
      }),
      invalidatesTags: ['ScraperQueues'],
    }),

    /**
     * POST /scraper/queues/:name/resume — Resume a single queue
     */
    resumeQueue: builder.mutation<{ success: boolean; queue: string; isPaused: boolean }, string>({
      query: name => ({
        url: `/scraper/queues/${name}/resume`,
        method: 'POST',
      }),
      invalidatesTags: ['ScraperQueues'],
    }),

    /**
     * POST /scraper/queues/pause-all — Pause all queues
     */
    pauseAllQueues: builder.mutation<{ success: boolean; isPaused: boolean }, void>({
      query: () => ({
        url: '/scraper/queues/pause-all',
        method: 'POST',
      }),
      invalidatesTags: ['ScraperQueues'],
    }),

    /**
     * POST /scraper/queues/resume-all — Resume all queues
     */
    resumeAllQueues: builder.mutation<{ success: boolean; isPaused: boolean }, void>({
      query: () => ({
        url: '/scraper/queues/resume-all',
        method: 'POST',
      }),
      invalidatesTags: ['ScraperQueues'],
    }),
  }),
})

export const {
  useAddScrapeJobMutation,
  useGetScrapeJobsQuery,
  useGetScrapeJobByIdQuery,
  useCancelScrapeJobMutation,
  useClearJobsByStatusMutation,
  useRetryScrapeJobMutation,
  useGetQueueHealthQuery,
  usePauseQueueMutation,
  useResumeQueueMutation,
  usePauseAllQueuesMutation,
  useResumeAllQueuesMutation,
} = scraperApi
