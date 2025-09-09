declare module '@repo/auth' {
  import type { Api, BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query/react'
  import type { Reducer, Slice } from '@reduxjs/toolkit'

  export interface TanStackRouteGuardOptions {
    requireAuth?: boolean
    redirectTo?: string
    useAuth?: () => any
  }

  export const authApi: Api<BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError, {}, {}>, any, any, any, any>
  export const authReducer: Reducer
  export const authSlice: Slice
  export const useAuth: () => any
  export const createTanStackRouteGuard: (options: TanStackRouteGuardOptions) => any
}

declare module '@repo/auth/react-router' {
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
  export const LoginForm: ComponentType
  export const SignupForm: ComponentType
  export const authApi: Api<BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError, {}, {}>, any, any, any, any>
  export const authReducer: Reducer
  export const useAuth: () => any
}
