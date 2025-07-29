declare module '@repo/auth' {
  import type { ComponentType } from 'react'
  import type { Api, BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query/react'
  import type { Reducer, Slice } from '@reduxjs/toolkit'

  export interface RouteGuardProps {
    children: React.ReactNode
    requiredRole?: string
    redirectTo?: string
    unauthorizedTo?: string
    requireVerified?: boolean
  }

  export const RouteGuard: ComponentType<RouteGuardProps>
  export const authApi: Api<BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError, {}, {}>, any, any, any, any>
  export const authReducer: Reducer
} 