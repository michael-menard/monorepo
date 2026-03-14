import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

export interface Plan {
  id: string
  planSlug: string
  title: string
  summary: string | null
  planType: string | null
  status: string
  featureDir: string | null
  storyPrefix: string | null
  estimatedStories: number | null
  tags: string[] | null
  priority: string | null
  priorityOrder: number | null
  createdAt: string
  updatedAt: string
}

export interface PlanListResponse {
  data: Plan[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface PlanDetails {
  id: string
  planSlug: string
  title: string
  summary: string | null
  planType: string | null
  status: string
  featureDir: string | null
  storyPrefix: string | null
  estimatedStories: number | null
  tags: string[] | null
  priority: string | null
  createdAt: string
  updatedAt: string
  details: {
    rawContent: string
    phases: unknown
    sections: unknown
    formatVersion: string | null
    sourceFile: string | null
    contentHash: string | null
    importedAt: string | null
    updatedAt: string
  } | null
}

export interface PlanStory {
  storyId: string
  title: string | null
  state: string | null
  priority: string | null
  currentPhase: string | null
  phaseStatus: string | null
  isBlocked: boolean
  hasBlockers: boolean
  createdAt: string | null
  updatedAt: string | null
}

export const roadmapApi = createApi({
  reducerPath: 'roadmapApi',
  baseQuery: fetchBaseQuery({ baseUrl: '/api/v1' }),
  endpoints: builder => ({
    getPlans: builder.query<
      PlanListResponse,
      {
        page?: number
        limit?: number
        status?: string[]
        planType?: string[]
        priority?: string[]
        tags?: string[]
        excludeCompleted?: boolean
        search?: string
      }
    >({
      query: params => ({
        url: '/roadmap',
        params,
      }),
    }),
    getPlanBySlug: builder.query<PlanDetails, string>({
      query: slug => `/roadmap/${slug}`,
    }),
    getStoriesByPlanSlug: builder.query<PlanStory[], string>({
      query: slug => `/roadmap/${slug}/stories`,
    }),
    reorderPlans: builder.mutation<
      { success: boolean },
      { priority: string; items: Array<{ id: string; priorityOrder: number }> }
    >({
      query: body => ({
        url: '/roadmap/reorder',
        method: 'PATCH',
        body,
      }),
    }),
    updatePlan: builder.mutation<
      PlanDetails,
      {
        slug: string
        input: Partial<
          Pick<
            PlanDetails,
            | 'title'
            | 'summary'
            | 'planType'
            | 'status'
            | 'featureDir'
            | 'storyPrefix'
            | 'estimatedStories'
            | 'tags'
            | 'priority'
          >
        >
      }
    >({
      query: ({ slug, input }) => ({
        url: `/roadmap/${slug}`,
        method: 'PATCH',
        body: input,
      }),
    }),
  }),
})

export const {
  useGetPlansQuery,
  useGetPlanBySlugQuery,
  useGetStoriesByPlanSlugQuery,
  useReorderPlansMutation,
  useUpdatePlanMutation,
} = roadmapApi
