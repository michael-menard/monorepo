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

export const roadmapApi = createApi({
  reducerPath: 'roadmapApi',
  baseQuery: fetchBaseQuery({ baseUrl: '/api/v1' }),
  endpoints: builder => ({
    getPlans: builder.query<
      PlanListResponse,
      { page?: number; limit?: number; status?: string; planType?: string; priority?: string }
    >({
      query: params => ({
        url: '/roadmap',
        params,
      }),
    }),
    getPlanBySlug: builder.query<PlanDetails, string>({
      query: slug => `/roadmap/${slug}`,
    }),
  }),
})

export const { useGetPlansQuery, useGetPlanBySlugQuery } = roadmapApi
