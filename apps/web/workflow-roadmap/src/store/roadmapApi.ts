import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

export interface Plan {
  id: string
  planSlug: string
  title: string
  summary: string | null
  planType: string | null
  status: string
  storyPrefix: string | null
  tags: string[] | null
  priority: string | null
  priorityOrder: number | null
  supersedesPlanSlug: string | null
  createdAt: string
  updatedAt: string
  // Story state breakdown
  totalStories: number
  completedStories: number
  activeStories: number
  blockedStories: number
  lastStoryActivityAt: string | null
  // Churn metrics
  churnDepth: number
  hasRegression: boolean
  // Hover detail
  nextStory: { storyId: string; title: string } | null
  blockedStoryList: Array<{ storyId: string; title: string }>
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
  description: string | null
  state: string | null
  priority: string | null
  currentPhase: string | null
  phaseStatus: string | null
  isBlocked: boolean
  hasBlockers: boolean
  blockedByStory: string | null
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
  blockedReason: string | null
  startedAt: string | null
  completedAt: string | null
  tags: string[] | null
  experimentVariant: string | null
  outcome: {
    finalVerdict: string
    qualityScore: number
    reviewIterations: number
    qaIterations: number
    durationMs: number
    totalInputTokens: number
    totalOutputTokens: number
    totalCachedTokens: number
    estimatedTotalCost: string
    primaryBlocker: string | null
    completedAt: string | null
  } | null
  contentSections: Array<{ sectionName: string; contentText: string | null }>
  stateHistory: Array<{
    eventType: string
    fromState: string | null
    toState: string | null
    createdAt: string
  }>
  currentWorkState: {
    branch: string | null
    phase: string | null
    nextSteps: unknown
    blockers: unknown
  } | null
  linkedPlans: Array<{ planSlug: string; linkType: string }>
  dependencies: Array<{ dependsOnId: string; dependencyType: string }>
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
    updateStory: builder.mutation<
      { storyId: string },
      { storyId: string; input: { description?: string | null } }
    >({
      query: ({ storyId, input }) => ({
        url: `/stories/${storyId}`,
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
  useUpdateStoryMutation,
} = roadmapApi
