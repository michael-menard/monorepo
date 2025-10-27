import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import type { UserStats, RecentActivity, QuickAction } from '../profile'
import { mockUserStats, getProfileDashboardData, getRecentActivities } from '../profile'

export interface ProfileState {
  userStats: UserStats | null
  recentActivities: RecentActivity[]
  quickActions: QuickAction[]
  loading: boolean
  error: string | null
  activityFilters: {
    type: RecentActivity['type'] | null
    limit: number
  }
}

const initialState: ProfileState = {
  userStats: null,
  recentActivities: [],
  quickActions: [],
  loading: false,
  error: null,
  activityFilters: {
    type: null,
    limit: 10,
  },
}

// Async thunks
export const fetchProfileData = createAsyncThunk(
  'profile/fetchProfileData',
  async (_, { rejectWithValue }) => {
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 800))
      return getProfileDashboardData()
    } catch (error) {
      return rejectWithValue('Failed to fetch profile data')
    }
  },
)

export const fetchUserStats = createAsyncThunk(
  'profile/fetchUserStats',
  async (_, { rejectWithValue }) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 600))
      return mockUserStats
    } catch (error) {
      return rejectWithValue('Failed to fetch user stats')
    }
  },
)

export const fetchRecentActivities = createAsyncThunk(
  'profile/fetchRecentActivities',
  async (limit: number = 10, { rejectWithValue }) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500))
      return getRecentActivities(limit)
    } catch (error) {
      return rejectWithValue('Failed to fetch recent activities')
    }
  },
)

export const addRecentActivity = createAsyncThunk(
  'profile/addRecentActivity',
  async (activity: Omit<RecentActivity, 'id' | 'timestamp'>, { rejectWithValue }) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 300))

      const newActivity: RecentActivity = {
        ...activity,
        id: Date.now().toString(),
        timestamp: new Date(),
      }

      return newActivity
    } catch (error) {
      return rejectWithValue('Failed to add recent activity')
    }
  },
)

export const updateUserStats = createAsyncThunk(
  'profile/updateUserStats',
  async (updates: Partial<UserStats>, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { profile: ProfileState }
      const currentStats = state.profile.userStats

      if (!currentStats) {
        return rejectWithValue('No user stats to update')
      }

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 400))

      return { ...currentStats, ...updates }
    } catch (error) {
      return rejectWithValue('Failed to update user stats')
    }
  },
)

export const refreshProfileStats = createAsyncThunk(
  'profile/refreshStats',
  async (_, { getState, rejectWithValue }) => {
    try {
      // This would typically recalculate stats based on current data
      // For now, we'll simulate an API call that returns updated stats
      await new Promise(resolve => setTimeout(resolve, 500))

      // In a real app, this would calculate stats from wishlist and MOC data
      const updatedStats = {
        ...mockUserStats,
        // Add some dynamic updates
        profileViews: mockUserStats.profileViews + Math.floor(Math.random() * 10),
        followersCount: mockUserStats.followersCount + Math.floor(Math.random() * 3),
      }

      return updatedStats
    } catch (error) {
      return rejectWithValue('Failed to refresh profile stats')
    }
  },
)

const profileSlice = createSlice({
  name: 'profile',
  initialState,
  reducers: {
    setActivityFilter: (state, action: PayloadAction<Partial<ProfileState['activityFilters']>>) => {
      state.activityFilters = { ...state.activityFilters, ...action.payload }
    },
    clearActivityFilters: state => {
      state.activityFilters = {
        type: null,
        limit: 10,
      }
    },
    clearError: state => {
      state.error = null
    },
    incrementProfileViews: state => {
      if (state.userStats) {
        state.userStats.profileViews += 1
      }
    },
    updateQuickAction: (
      state,
      action: PayloadAction<{ id: string; updates: Partial<QuickAction> }>,
    ) => {
      const { id, updates } = action.payload
      const index = state.quickActions.findIndex(action => action.id === id)
      if (index !== -1) {
        state.quickActions[index] = { ...state.quickActions[index], ...updates }
      }
    },
  },
  extraReducers: builder => {
    builder
      // Fetch profile data
      .addCase(fetchProfileData.pending, state => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchProfileData.fulfilled, (state, action) => {
        state.loading = false
        state.userStats = action.payload.stats
        state.recentActivities = action.payload.recentActivities
        state.quickActions = action.payload.quickActions
      })
      .addCase(fetchProfileData.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })

      // Fetch user stats
      .addCase(fetchUserStats.pending, state => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchUserStats.fulfilled, (state, action) => {
        state.loading = false
        state.userStats = action.payload
      })
      .addCase(fetchUserStats.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })

      // Fetch recent activities
      .addCase(fetchRecentActivities.fulfilled, (state, action) => {
        state.recentActivities = action.payload
      })
      .addCase(fetchRecentActivities.rejected, (state, action) => {
        state.error = action.payload as string
      })

      // Add recent activity
      .addCase(addRecentActivity.fulfilled, (state, action) => {
        // Add to beginning of array and limit to prevent infinite growth
        state.recentActivities.unshift(action.payload)
        if (state.recentActivities.length > 50) {
          state.recentActivities = state.recentActivities.slice(0, 50)
        }
      })
      .addCase(addRecentActivity.rejected, (state, action) => {
        state.error = action.payload as string
      })

      // Update user stats
      .addCase(updateUserStats.fulfilled, (state, action) => {
        state.userStats = action.payload
      })
      .addCase(updateUserStats.rejected, (state, action) => {
        state.error = action.payload as string
      })

      // Refresh profile stats
      .addCase(refreshProfileStats.pending, state => {
        state.loading = true
      })
      .addCase(refreshProfileStats.fulfilled, (state, action) => {
        state.loading = false
        state.userStats = action.payload
      })
      .addCase(refreshProfileStats.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
  },
})

export const {
  setActivityFilter,
  clearActivityFilters,
  clearError,
  incrementProfileViews,
  updateQuickAction,
} = profileSlice.actions

export default profileSlice.reducer

// Selectors
export const selectUserStats = (state: { profile: ProfileState }) => state.profile.userStats
export const selectRecentActivities = (state: { profile: ProfileState }) =>
  state.profile.recentActivities
export const selectQuickActions = (state: { profile: ProfileState }) => state.profile.quickActions
export const selectProfileLoading = (state: { profile: ProfileState }) => state.profile.loading
export const selectProfileError = (state: { profile: ProfileState }) => state.profile.error
export const selectActivityFilters = (state: { profile: ProfileState }) =>
  state.profile.activityFilters

export const selectFilteredRecentActivities = (state: { profile: ProfileState }) => {
  const { recentActivities, activityFilters } = state.profile
  let filtered = recentActivities

  if (activityFilters.type) {
    filtered = filtered.filter(activity => activity.type === activityFilters.type)
  }

  return filtered.slice(0, activityFilters.limit)
}

export const selectActivityTypes = (state: { profile: ProfileState }) => {
  return Array.from(new Set(state.profile.recentActivities.map(activity => activity.type)))
}
