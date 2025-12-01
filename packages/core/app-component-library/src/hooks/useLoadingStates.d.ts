export type LoadingType = 'idle' | 'loading' | 'success' | 'error'
export interface LoadingState {
  type: LoadingType
  message?: string
  progress?: number
  error?: Error | string | null
}
export interface UseLoadingStatesOptions {
  initialType?: LoadingType
  initialMessage?: string
  autoReset?: boolean
  resetDelay?: number
  onStateChange?: (state: LoadingState) => void
}
export interface UseLoadingStatesReturn {
  loadingState: LoadingState
  isLoading: boolean
  isSuccess: boolean
  isError: boolean
  isIdle: boolean
  startLoading: (message?: string) => void
  setProgress: (progress: number) => void
  setSuccess: (message?: string) => void
  setError: (error: Error | string) => void
  reset: () => void
  withLoading: <T>(asyncFn: () => Promise<T>, message?: string) => Promise<T>
  createLoadingState: (key: string) => {
    startLoading: (message?: string) => void
    setProgress: (progress: number) => void
    setSuccess: (message?: string) => void
    setError: (error: Error | string) => void
    reset: () => void
    state: LoadingState
  }
}
export declare const useLoadingStates: (options?: UseLoadingStatesOptions) => UseLoadingStatesReturn
export declare const useMultipleLoadingStates: () => {
  states: Map<string, LoadingState>
  getState: (key: string) => LoadingState
  createLoadingState: (key: string) => {
    startLoading: (message?: string) => void
    setProgress: (progress: number) => void
    setSuccess: (message?: string) => void
    setError: (error: Error | string) => void
    reset: () => void
    readonly state: LoadingState
  }
}
//# sourceMappingURL=useLoadingStates.d.ts.map
