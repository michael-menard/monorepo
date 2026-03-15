import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

export interface RoadmapFiltersState {
  status: string
  priority: string
  type: string
  excludeCompleted: boolean
  search: string
  sortKey: string
  sortDirection: 'asc' | 'desc'
  pageSize: number
}

const defaultState: RoadmapFiltersState = {
  status: '',
  priority: '',
  type: '',
  excludeCompleted: true,
  search: '',
  sortKey: 'createdAt',
  sortDirection: 'desc',
  pageSize: 10,
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
    setPageSize(state, action: PayloadAction<number>) {
      state.pageSize = action.payload
    },
  },
})

export const {
  setStatus,
  setPriority,
  setType,
  setExcludeCompleted,
  setSearch,
  setSort,
  setPageSize,
} = roadmapFiltersSlice.actions
