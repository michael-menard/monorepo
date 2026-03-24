import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

export interface RoadmapFiltersState {
  status: string
  priority: string
  type: string
  tag: string
  excludeCompleted: boolean
  search: string
  sortKey: string
  sortDirection: 'asc' | 'desc'
}

const defaultState: RoadmapFiltersState = {
  status: '',
  priority: '',
  type: '',
  tag: '',
  excludeCompleted: true,
  search: '',
  sortKey: 'createdAt',
  sortDirection: 'desc',
}

function loadFromStorage(): RoadmapFiltersState {
  try {
    const raw = localStorage.getItem('roadmapFilters')
    if (!raw) return defaultState
    return { ...defaultState, ...JSON.parse(raw) }
  } catch {
    return defaultState
  }
}

export const roadmapFiltersSlice = createSlice({
  name: 'roadmapFilters',
  initialState: loadFromStorage,
  reducers: {
    setStatus(state, action: PayloadAction<string>) {
      state.status = action.payload
    },
    setPriority(state, action: PayloadAction<string>) {
      state.priority = action.payload
    },
    setType(state, action: PayloadAction<string>) {
      state.type = action.payload
    },
    setTag(state, action: PayloadAction<string>) {
      state.tag = action.payload
    },
    setExcludeCompleted(state, action: PayloadAction<boolean>) {
      state.excludeCompleted = action.payload
    },
    setSearch(state, action: PayloadAction<string>) {
      state.search = action.payload
    },
    setSort(state, action: PayloadAction<{ key: string; direction: 'asc' | 'desc' }>) {
      state.sortKey = action.payload.key
      state.sortDirection = action.payload.direction
    },
    resetFilters() {
      return defaultState
    },
  },
})

export const {
  setStatus,
  setPriority,
  setType,
  setTag,
  setExcludeCompleted,
  setSearch,
  setSort,
  resetFilters,
} = roadmapFiltersSlice.actions
