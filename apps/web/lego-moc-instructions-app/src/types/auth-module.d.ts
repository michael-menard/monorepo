/**
 * Local module declarations to help the app's TS resolver "see" exports from the @repo/auth package source.
 * This is needed because we're importing directly from the workspace source with bundler resolution.
 */
declare module '@repo/auth' {
  export * from '../../../../../packages/auth/src/index';
}

declare module '@repo/auth/components/TanStackRouteGuard' {
  export * from '../../../../../packages/auth/src/components/TanStackRouteGuard';
}
