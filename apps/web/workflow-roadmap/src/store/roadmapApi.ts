import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

export interface Plan {
  id: string
  planSlug: string
  title: string
  summary: string | null
  planType: string | null
  status: string
  storyPrefix: string | null
  storyCount: number
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
  storyPrefix: string | null
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

export interface StoryDetails {
  id: string
  storyId: string
  title: string
  description: string | null
  storyType: string
  epic: string | null
  wave: number | null
  priority: string | null
  complexity: string | null
  storyPoints: number | null
  state: string
  metadata: {
    surfaces?: { backend?: boolean; frontend?: boolean; database?: boolean; infra?: boolean }
    tags?: string[]
    experimentVariant?: 'control' | 'variant_a' | 'variant_b'
    blocked_by?: string[]
    blocks?: string[]
  } | null
  createdAt: string
  updatedAt: string
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
      transformResponse: (response: { data: PlanStory[] }) => response.data,
    }),
    getStoryById: builder.query<StoryDetails, string>({
      query: storyId => `/stories/${storyId}`,
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
            'title' | 'summary' | 'planType' | 'status' | 'storyPrefix' | 'tags' | 'priority'
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
  useGetStoryByIdQuery,
  useReorderPlansMutation,
  useUpdatePlanMutation,
} = roadmapApi
