import { createSlice, PayloadAction } from '@reduxjs/toolkit'

interface ExampleState {
  count: number
  isLoading: boolean
  error: string | null
}

const initialState: ExampleState = {
  count: 0,
  isLoading: false,
  error: null,
}

const exampleSlice = createSlice({
  name: 'example',
  initialState,
  reducers: {
    increment: (state) => {
      state.count += 1
    },
    decrement: (state) => {
      state.count -= 1
    },
    incrementByAmount: (state, action: PayloadAction<number>) => {
      state.count += action.payload
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload
    },
  },
})

export const { increment, decrement, incrementByAmount, setLoading, setError } = exampleSlice.actions
export default exampleSlice.reducer 