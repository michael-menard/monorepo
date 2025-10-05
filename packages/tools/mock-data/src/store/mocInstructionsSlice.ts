import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { MockInstruction } from '../moc-instructions';
import { 
  mockMocInstructions, 
  getMocInstructionStats, 
  getMocInstructionCategories,
  getMocInstructionsByCategory,
  getMocInstructionsByDifficulty,
  getMocInstructionsByAuthor,
  getPublishedMocInstructions
} from '../moc-instructions';

export interface MocInstructionsState {
  instructions: MockInstruction[];
  loading: boolean;
  error: string | null;
  filters: {
    search: string | null;
    category: string | null;
    difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert' | null;
    author: string | null;
    tags: string[];
    minParts: number | null;
    maxParts: number | null;
    minTime: number | null;
    maxTime: number | null;
    sortBy: 'title' | 'createdAt' | 'updatedAt' | 'rating' | 'downloadCount';
    sortOrder: 'asc' | 'desc';
    isPublic: boolean | null;
    isPublished: boolean | null;
    showUnpublished: boolean;
  };
  stats: {
    total: number;
    published: number;
    totalDownloads: number;
    averageRating: number;
    categories: number;
    authors: number;
  } | null;
  selectedInstruction: MockInstruction | null;
}

const initialState: MocInstructionsState = {
  instructions: [],
  loading: false,
  error: null,
  filters: {
    search: null,
    category: null,
    difficulty: null,
    author: null,
    tags: [],
    minParts: null,
    maxParts: null,
    minTime: null,
    maxTime: null,
    sortBy: 'createdAt',
    sortOrder: 'desc',
    isPublic: null,
    isPublished: null,
    showUnpublished: false,
  },
  stats: null,
  selectedInstruction: null,
};

// Async thunks
export const fetchMocInstructions = createAsyncThunk(
  'mocInstructions/fetchInstructions',
  async (filters: Partial<MocInstructionsState['filters']> = {}, { rejectWithValue }) => {
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1200));

      let filteredInstructions = [...mockMocInstructions];

      // Apply filters if provided
      if (filters) {
        if (filters.search) {
          const searchLower = filters.search.toLowerCase();
          filteredInstructions = filteredInstructions.filter(inst =>
            inst.title.toLowerCase().includes(searchLower) ||
            inst.description.toLowerCase().includes(searchLower) ||
            inst.author.toLowerCase().includes(searchLower) ||
            inst.tags.some(tag => tag.toLowerCase().includes(searchLower))
          );
        }

        if (filters.category) {
          filteredInstructions = filteredInstructions.filter(inst => inst.category === filters.category);
        }

        if (filters.difficulty) {
          filteredInstructions = filteredInstructions.filter(inst => inst.difficulty === filters.difficulty);
        }

        if (filters.author) {
          filteredInstructions = filteredInstructions.filter(inst => inst.author === filters.author);
        }

        if (filters.tags && filters.tags.length > 0) {
          filteredInstructions = filteredInstructions.filter(inst =>
            filters.tags!.some(tag => inst.tags.includes(tag))
          );
        }

        if (filters.minParts) {
          filteredInstructions = filteredInstructions.filter(inst =>
            (inst.totalParts || 0) >= filters.minParts!
          );
        }

        if (filters.maxParts) {
          filteredInstructions = filteredInstructions.filter(inst =>
            (inst.totalParts || 0) <= filters.maxParts!
          );
        }

        if (filters.minTime) {
          filteredInstructions = filteredInstructions.filter(inst =>
            (inst.estimatedTime || 0) >= filters.minTime!
          );
        }

        if (filters.maxTime) {
          filteredInstructions = filteredInstructions.filter(inst =>
            (inst.estimatedTime || 0) <= filters.maxTime!
          );
        }

        if (filters.isPublic !== null && filters.isPublic !== undefined) {
          filteredInstructions = filteredInstructions.filter(inst => inst.isPublic === filters.isPublic);
        }

        if (filters.isPublished !== null && filters.isPublished !== undefined) {
          filteredInstructions = filteredInstructions.filter(inst => inst.isPublished === filters.isPublished);
        }

        // Apply sorting
        const sortBy = filters.sortBy || 'createdAt';
        const sortOrder = filters.sortOrder || 'desc';

        filteredInstructions.sort((a, b) => {
          let aValue: any = a[sortBy as keyof MockInstruction];
          let bValue: any = b[sortBy as keyof MockInstruction];

          // Handle date sorting
          if (sortBy === 'createdAt' || sortBy === 'updatedAt') {
            aValue = new Date(aValue).getTime();
            bValue = new Date(bValue).getTime();
          }

          // Handle numeric sorting
          if (typeof aValue === 'number' && typeof bValue === 'number') {
            return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
          }

          // Handle string sorting
          if (typeof aValue === 'string' && typeof bValue === 'string') {
            return sortOrder === 'asc'
              ? aValue.localeCompare(bValue)
              : bValue.localeCompare(aValue);
          }

          return 0;
        });
      }

      return filteredInstructions;
    } catch (error) {
      return rejectWithValue('Failed to fetch MOC instructions');
    }
  }
);

export const fetchMocInstructionById = createAsyncThunk(
  'mocInstructions/fetchById',
  async (id: string, { rejectWithValue }) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const instruction = mockMocInstructions.find(inst => inst.id === id);
      if (!instruction) {
        return rejectWithValue('Instruction not found');
      }
      
      return instruction;
    } catch (error) {
      return rejectWithValue('Failed to fetch MOC instruction');
    }
  }
);

export const createMocInstruction = createAsyncThunk(
  'mocInstructions/create',
  async (instruction: Omit<MockInstruction, 'id' | 'createdAt' | 'updatedAt' | 'downloadCount' | 'rating'>, { rejectWithValue }) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const newInstruction: MockInstruction = {
        ...instruction,
        id: Date.now().toString(),
        downloadCount: 0,
        rating: undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      return newInstruction;
    } catch (error) {
      return rejectWithValue('Failed to create MOC instruction');
    }
  }
);

export const updateMocInstruction = createAsyncThunk(
  'mocInstructions/update',
  async ({ id, updates }: { id: string; updates: Partial<MockInstruction> }, { rejectWithValue }) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 800));
      
      return {
        id,
        updates: {
          ...updates,
          updatedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      return rejectWithValue('Failed to update MOC instruction');
    }
  }
);

export const deleteMocInstruction = createAsyncThunk(
  'mocInstructions/delete',
  async (id: string, { rejectWithValue }) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 600));
      return id;
    } catch (error) {
      return rejectWithValue('Failed to delete MOC instruction');
    }
  }
);

export const togglePublishStatus = createAsyncThunk(
  'mocInstructions/togglePublish',
  async (id: string, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { mocInstructions: MocInstructionsState };
      const instruction = state.mocInstructions.instructions.find(inst => inst.id === id);
      
      if (!instruction) {
        return rejectWithValue('Instruction not found');
      }
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      return {
        id,
        updates: {
          isPublished: !instruction.isPublished,
          updatedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      return rejectWithValue('Failed to toggle publish status');
    }
  }
);

export const incrementDownloadCount = createAsyncThunk(
  'mocInstructions/incrementDownload',
  async (id: string, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { mocInstructions: MocInstructionsState };
      const instruction = state.mocInstructions.instructions.find(inst => inst.id === id);
      
      if (!instruction) {
        return rejectWithValue('Instruction not found');
      }
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 300));
      
      return {
        id,
        updates: {
          downloadCount: instruction.downloadCount + 1,
          updatedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      return rejectWithValue('Failed to increment download count');
    }
  }
);

const mocInstructionsSlice = createSlice({
  name: 'mocInstructions',
  initialState,
  reducers: {
    setFilter: (state, action: PayloadAction<Partial<MocInstructionsState['filters']>>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters: (state) => {
      state.filters = {
        search: null,
        category: null,
        difficulty: null,
        author: null,
        tags: [],
        minParts: null,
        maxParts: null,
        minTime: null,
        maxTime: null,
        sortBy: 'createdAt',
        sortOrder: 'desc',
        isPublic: null,
        isPublished: null,
        showUnpublished: false,
      };
    },
    clearError: (state) => {
      state.error = null;
    },
    setSelectedInstruction: (state, action: PayloadAction<MockInstruction | null>) => {
      state.selectedInstruction = action.payload;
    },
    updateStats: (state) => {
      // Calculate stats from current instructions
      const stats = getMocInstructionStats();
      state.stats = stats;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch MOC instructions
      .addCase(fetchMocInstructions.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMocInstructions.fulfilled, (state, action) => {
        state.loading = false;
        state.instructions = action.payload;
        state.stats = getMocInstructionStats();
      })
      .addCase(fetchMocInstructions.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Fetch by ID
      .addCase(fetchMocInstructionById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMocInstructionById.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedInstruction = action.payload;
      })
      .addCase(fetchMocInstructionById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Create instruction
      .addCase(createMocInstruction.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createMocInstruction.fulfilled, (state, action) => {
        state.loading = false;
        state.instructions.push(action.payload);
        state.stats = getMocInstructionStats();
      })
      .addCase(createMocInstruction.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Update instruction
      .addCase(updateMocInstruction.fulfilled, (state, action) => {
        const { id, updates } = action.payload;
        const index = state.instructions.findIndex(inst => inst.id === id);
        if (index !== -1) {
          state.instructions[index] = { ...state.instructions[index], ...updates };
          state.stats = getMocInstructionStats();
        }
        
        // Update selected instruction if it's the same one
        if (state.selectedInstruction?.id === id) {
          state.selectedInstruction = { ...state.selectedInstruction, ...updates };
        }
      })
      .addCase(updateMocInstruction.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      
      // Delete instruction
      .addCase(deleteMocInstruction.fulfilled, (state, action) => {
        state.instructions = state.instructions.filter(inst => inst.id !== action.payload);
        state.stats = getMocInstructionStats();
        
        // Clear selected instruction if it was deleted
        if (state.selectedInstruction?.id === action.payload) {
          state.selectedInstruction = null;
        }
      })
      .addCase(deleteMocInstruction.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      
      // Toggle publish status
      .addCase(togglePublishStatus.fulfilled, (state, action) => {
        const { id, updates } = action.payload;
        const index = state.instructions.findIndex(inst => inst.id === id);
        if (index !== -1) {
          state.instructions[index] = { ...state.instructions[index], ...updates };
          state.stats = getMocInstructionStats();
        }
      })
      .addCase(togglePublishStatus.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      
      // Increment download count
      .addCase(incrementDownloadCount.fulfilled, (state, action) => {
        const { id, updates } = action.payload;
        const index = state.instructions.findIndex(inst => inst.id === id);
        if (index !== -1) {
          state.instructions[index] = { ...state.instructions[index], ...updates };
          state.stats = getMocInstructionStats();
        }
      })
      .addCase(incrementDownloadCount.rejected, (state, action) => {
        state.error = action.payload as string;
      });
  },
});

export const { 
  setFilter, 
  clearFilters, 
  clearError, 
  setSelectedInstruction, 
  updateStats 
} = mocInstructionsSlice.actions;

export default mocInstructionsSlice.reducer;

// Selectors
export const selectMocInstructions = (state: { mocInstructions: MocInstructionsState }) => state.mocInstructions.instructions;
export const selectMocInstructionsLoading = (state: { mocInstructions: MocInstructionsState }) => state.mocInstructions.loading;
export const selectMocInstructionsError = (state: { mocInstructions: MocInstructionsState }) => state.mocInstructions.error;
export const selectMocInstructionsFilters = (state: { mocInstructions: MocInstructionsState }) => state.mocInstructions.filters;
export const selectMocInstructionsStats = (state: { mocInstructions: MocInstructionsState }) => {
  const instructions = state.mocInstructions.instructions;

  if (instructions.length === 0) {
    return null;
  }

  const published = instructions.filter(inst => inst.isPublished);
  const totalDownloads = instructions.reduce((sum, inst) => sum + inst.downloadCount, 0);
  const averageRating = instructions.reduce((sum, inst) => sum + (inst.rating || 0), 0) / instructions.length;
  const categories = new Set(instructions.map(inst => inst.category)).size;
  const authors = new Set(instructions.map(inst => inst.author)).size;

  return {
    total: instructions.length,
    published: published.length,
    totalDownloads,
    averageRating,
    categories,
    authors,
  };
};
export const selectSelectedMocInstruction = (state: { mocInstructions: MocInstructionsState }) => state.mocInstructions.selectedInstruction;

export const selectFilteredMocInstructions = (state: { mocInstructions: MocInstructionsState }) => {
  const { instructions, filters } = state.mocInstructions;
  let filtered = instructions;

  if (filters.search) {
    const searchLower = filters.search.toLowerCase();
    filtered = filtered.filter(inst =>
      inst.title.toLowerCase().includes(searchLower) ||
      inst.description.toLowerCase().includes(searchLower) ||
      inst.author.toLowerCase().includes(searchLower) ||
      inst.tags.some(tag => tag.toLowerCase().includes(searchLower))
    );
  }

  if (filters.category) {
    filtered = filtered.filter(inst => inst.category === filters.category);
  }

  if (filters.difficulty) {
    filtered = filtered.filter(inst => inst.difficulty === filters.difficulty);
  }

  if (filters.author) {
    filtered = filtered.filter(inst => inst.author === filters.author);
  }

  if (filters.tags.length > 0) {
    filtered = filtered.filter(inst =>
      filters.tags.some(tag => inst.tags.includes(tag))
    );
  }

  if (filters.minParts) {
    filtered = filtered.filter(inst => (inst.totalParts || 0) >= filters.minParts!);
  }

  if (filters.maxParts) {
    filtered = filtered.filter(inst => (inst.totalParts || 0) <= filters.maxParts!);
  }

  if (filters.minTime) {
    filtered = filtered.filter(inst => (inst.estimatedTime || 0) >= filters.minTime!);
  }

  if (filters.maxTime) {
    filtered = filtered.filter(inst => (inst.estimatedTime || 0) <= filters.maxTime!);
  }

  if (filters.isPublic !== null && filters.isPublic !== undefined) {
    filtered = filtered.filter(inst => inst.isPublic === filters.isPublic);
  }

  if (filters.isPublished !== null && filters.isPublished !== undefined) {
    filtered = filtered.filter(inst => inst.isPublished === filters.isPublished);
  }

  if (!filters.showUnpublished) {
    filtered = filtered.filter(inst => inst.isPublished);
  }

  // Apply sorting
  const sortBy = filters.sortBy;
  const sortOrder = filters.sortOrder;

  filtered.sort((a, b) => {
    let aValue: any = a[sortBy as keyof MockInstruction];
    let bValue: any = b[sortBy as keyof MockInstruction];

    // Handle date sorting
    if (sortBy === 'createdAt' || sortBy === 'updatedAt') {
      aValue = new Date(aValue).getTime();
      bValue = new Date(bValue).getTime();
    }

    // Handle numeric sorting
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
    }

    // Handle string sorting
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortOrder === 'asc'
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }

    return 0;
  });

  return filtered;
};

export const selectMocInstructionCategories = (state: { mocInstructions: MocInstructionsState }) => {
  return Array.from(new Set(state.mocInstructions.instructions.map(inst => inst.category)));
};

export const selectMocInstructionAuthors = (state: { mocInstructions: MocInstructionsState }) => {
  return Array.from(new Set(state.mocInstructions.instructions.map(inst => inst.author)));
};
