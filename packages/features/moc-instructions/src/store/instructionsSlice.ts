import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import type { MockInstruction, MockInstructionFilter } from '../schemas'

interface InstructionsState {
  instructions: MockInstruction[]
  currentInstruction: MockInstruction | null
  isLoading: boolean
  error: string | null
  filters: MockInstructionFilter
  isCreating: boolean
  isEditing: boolean
}

const initialState: InstructionsState = {
  instructions: [],
  currentInstruction: null,
  isLoading: false,
  error: null,
  filters: {
    search: '',
    category: '',
    difficulty: undefined,
    author: '',
    tags: [],
    minParts: undefined,
    maxParts: undefined,
    minTime: undefined,
    maxTime: undefined,
    sortBy: 'createdAt',
    sortOrder: 'desc',
    isPublic: undefined,
    isPublished: undefined,
  },
  isCreating: false,
  isEditing: false,
}

export const instructionsSlice = createSlice({
  name: 'instructions',
  initialState,
  reducers: {
    setInstructions: (state, action: PayloadAction<MockInstruction[]>) => {
      state.instructions = action.payload
    },
    addInstruction: (state, action: PayloadAction<MockInstruction>) => {
      state.instructions.push(action.payload)
    },
    updateInstruction: (state, action: PayloadAction<MockInstruction>) => {
      const index = state.instructions.findIndex(
        instruction => instruction.id === action.payload.id,
      )
      if (index !== -1) {
        state.instructions[index] = action.payload
      }
    },
    removeInstruction: (state, action: PayloadAction<string>) => {
      state.instructions = state.instructions.filter(
        instruction => instruction.id !== action.payload,
      )
    },
    setCurrentInstruction: (state, action: PayloadAction<MockInstruction | null>) => {
      state.currentInstruction = action.payload
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload
    },
    setFilters: (state, action: PayloadAction<Partial<MockInstructionFilter>>) => {
      state.filters = { ...state.filters, ...action.payload }
    },
    setIsCreating: (state, action: PayloadAction<boolean>) => {
      state.isCreating = action.payload
    },
    setIsEditing: (state, action: PayloadAction<boolean>) => {
      state.isEditing = action.payload
    },
    clearFilters: state => {
      state.filters = initialState.filters
    },
  },
})

export const {
  setInstructions,
  addInstruction,
  updateInstruction,
  removeInstruction,
  setCurrentInstruction,
  setLoading,
  setError,
  setFilters,
  setIsCreating,
  setIsEditing,
  clearFilters,
} = instructionsSlice.actions

export default instructionsSlice.reducer
export const instructionsReducer = instructionsSlice.reducer
