import React from 'react'

// Export the Redux store and hooks
export { store, useAppDispatch, useAppSelector } from './store'
export type { RootState, AppDispatch } from './store'

// Export example slice actions
export { increment, decrement, incrementByAmount, setLoading, setError } from './store/exampleSlice'

// Export example component (placeholder)
export const ExampleComponent = () => {
  return React.createElement('div', null, 'Example Component')
} 