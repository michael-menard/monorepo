import { configureStore, createSlice } from '@reduxjs/toolkit'

const placeholderSlice = createSlice({
  name: 'placeholder',
  initialState: {},
  reducers: {},
})

export const store = configureStore({
  reducer: {
    placeholder: placeholderSlice.reducer,
  },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
