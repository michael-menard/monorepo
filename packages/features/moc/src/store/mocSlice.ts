import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { MocInstruction, MocFilter } from '../schemas';

interface MocState {
  instructions: MocInstruction[];
  currentInstruction: MocInstruction | null;
  isLoading: boolean;
  error: string | null;
  filters: MocFilter;
  isCreating: boolean;
  isEditing: boolean;
}

const initialState: MocState = {
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
};

export const mocSlice = createSlice({
  name: 'moc',
  initialState,
  reducers: {
    setInstructions: (state, action: PayloadAction<MocInstruction[]>) => {
      state.instructions = action.payload;
    },
    addInstruction: (state, action: PayloadAction<MocInstruction>) => {
      state.instructions.push(action.payload);
    },
    updateInstruction: (state, action: PayloadAction<MocInstruction>) => {
      const index = state.instructions.findIndex((instruction) => instruction.id === action.payload.id);
      if (index !== -1) {
        state.instructions[index] = action.payload;
      }
    },
    removeInstruction: (state, action: PayloadAction<string>) => {
      state.instructions = state.instructions.filter((instruction) => instruction.id !== action.payload);
    },
    setCurrentInstruction: (state, action: PayloadAction<MocInstruction | null>) => {
      state.currentInstruction = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    setFilters: (state, action: PayloadAction<Partial<MocFilter>>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    setIsCreating: (state, action: PayloadAction<boolean>) => {
      state.isCreating = action.payload;
    },
    setIsEditing: (state, action: PayloadAction<boolean>) => {
      state.isEditing = action.payload;
    },
    clearFilters: (state) => {
      state.filters = initialState.filters;
    },
  },
});

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
} = mocSlice.actions;

export default mocSlice.reducer; 