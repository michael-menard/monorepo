/**
 * Redux Store Types
 * Shared types for the Redux store to avoid circular imports
 */

// =============================================================================
// STORE TYPES
// =============================================================================

export interface StoreState {
  auth: unknown
  ui: unknown
  preferences: unknown
}

export type AppDispatch = (action: any) => any

export type AppThunk<ReturnType = void> = (
  dispatch: AppDispatch,
  getState: () => StoreState
) => ReturnType 