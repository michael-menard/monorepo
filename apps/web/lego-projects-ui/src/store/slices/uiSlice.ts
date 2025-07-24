/**
 * UI Slice
 * Manages global UI state including loading, modals, notifications, and theme
 */
import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'

// =============================================================================
// TYPES
// =============================================================================

export interface NotificationState {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message?: string
  duration?: number
  timestamp: string
}

export interface ModalState {
  id: string
  isOpen: boolean
  data?: unknown
}

export interface UIState {
  // Loading states
  isLoading: boolean
  loadingMessage: string | null
  
  // Theme
  theme: 'light' | 'dark' | 'auto'
  systemTheme: 'light' | 'dark'
  
  // Layout
  sidebarOpen: boolean
  mobileMenuOpen: boolean
  
  // Modals
  modals: Record<string, ModalState>
  
  // Notifications
  notifications: NotificationState[]
  
  // Navigation
  currentPage: string
  breadcrumbs: Array<{ label: string; href?: string }>
  
  // Search
  searchQuery: string
  searchOpen: boolean
  
  // Responsive
  isMobile: boolean
  screenSize: 'sm' | 'md' | 'lg' | 'xl' | '2xl'
}

// =============================================================================
// INITIAL STATE
// =============================================================================

const initialState: UIState = {
  // Loading states
  isLoading: false,
  loadingMessage: null,
  
  // Theme
  theme: 'auto',
  systemTheme: 'light',
  
  // Layout
  sidebarOpen: false,
  mobileMenuOpen: false,
  
  // Modals
  modals: {},
  
  // Notifications
  notifications: [],
  
  // Navigation
  currentPage: '/',
  breadcrumbs: [],
  
  // Search
  searchQuery: '',
  searchOpen: false,
  
  // Responsive
  isMobile: false,
  screenSize: 'lg',
}

// =============================================================================
// SLICE DEFINITION
// =============================================================================

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    // =============================================================================
    // LOADING STATES
    // =============================================================================
    
    setLoading: (state, action: PayloadAction<{ isLoading: boolean; message?: string }>) => {
      state.isLoading = action.payload.isLoading
      state.loadingMessage = action.payload.message || null
    },
    
    startLoading: (state, action: PayloadAction<string | undefined>) => {
      state.isLoading = true
      state.loadingMessage = action.payload || null
    },
    
    stopLoading: (state) => {
      state.isLoading = false
      state.loadingMessage = null
    },
    
    // =============================================================================
    // THEME MANAGEMENT
    // =============================================================================
    
    setTheme: (state, action: PayloadAction<'light' | 'dark' | 'auto'>) => {
      state.theme = action.payload
    },
    
    setSystemTheme: (state, action: PayloadAction<'light' | 'dark'>) => {
      state.systemTheme = action.payload
    },
    
    toggleTheme: (state) => {
      if (state.theme === 'auto') {
        state.theme = state.systemTheme === 'light' ? 'dark' : 'light'
      } else {
        state.theme = state.theme === 'light' ? 'dark' : 'light'
      }
    },
    
    // =============================================================================
    // LAYOUT MANAGEMENT
    // =============================================================================
    
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen
    },
    
    setSidebarOpen: (state, action: PayloadAction<boolean>) => {
      state.sidebarOpen = action.payload
    },
    
    toggleMobileMenu: (state) => {
      state.mobileMenuOpen = !state.mobileMenuOpen
    },
    
    setMobileMenuOpen: (state, action: PayloadAction<boolean>) => {
      state.mobileMenuOpen = action.payload
    },
    
    // =============================================================================
    // MODAL MANAGEMENT
    // =============================================================================
    
    openModal: (state, action: PayloadAction<{ id: string; data?: unknown }>) => {
      state.modals[action.payload.id] = {
        id: action.payload.id,
        isOpen: true,
        data: action.payload.data,
      }
    },
    
    closeModal: (state, action: PayloadAction<string>) => {
      if (state.modals[action.payload]) {
        state.modals[action.payload].isOpen = false
      }
    },
    
    removeModal: (state, action: PayloadAction<string>) => {
      delete state.modals[action.payload]
    },
    
    closeAllModals: (state) => {
      Object.keys(state.modals).forEach(id => {
        state.modals[id].isOpen = false
      })
    },
    
    // =============================================================================
    // NOTIFICATION MANAGEMENT
    // =============================================================================
    
    addNotification: (state, action: PayloadAction<Omit<NotificationState, 'id' | 'timestamp'>>) => {
      const notification: NotificationState = {
        ...action.payload,
        id: `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
      }
      state.notifications.push(notification)
    },
    
    removeNotification: (state, action: PayloadAction<string>) => {
      state.notifications = state.notifications.filter(
        notification => notification.id !== action.payload
      )
    },
    
    clearNotifications: (state) => {
      state.notifications = []
    },
    
    // =============================================================================
    // NAVIGATION
    // =============================================================================
    
    setCurrentPage: (state, action: PayloadAction<string>) => {
      state.currentPage = action.payload
    },
    
    setBreadcrumbs: (state, action: PayloadAction<Array<{ label: string; href?: string }>>) => {
      state.breadcrumbs = action.payload
    },
    
    addBreadcrumb: (state, action: PayloadAction<{ label: string; href?: string }>) => {
      state.breadcrumbs.push(action.payload)
    },
    
    // =============================================================================
    // SEARCH
    // =============================================================================
    
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload
    },
    
    setSearchOpen: (state, action: PayloadAction<boolean>) => {
      state.searchOpen = action.payload
    },
    
    toggleSearch: (state) => {
      state.searchOpen = !state.searchOpen
      if (!state.searchOpen) {
        state.searchQuery = ''
      }
    },
    
    // =============================================================================
    // RESPONSIVE
    // =============================================================================
    
    setIsMobile: (state, action: PayloadAction<boolean>) => {
      state.isMobile = action.payload
    },
    
    setScreenSize: (state, action: PayloadAction<'sm' | 'md' | 'lg' | 'xl' | '2xl'>) => {
      state.screenSize = action.payload
      state.isMobile = ['sm', 'md'].includes(action.payload)
    },
  },
})

// =============================================================================
// EXPORTS
// =============================================================================

export const uiActions: typeof uiSlice.actions = uiSlice.actions
export { uiSlice }
export default uiSlice.reducer

// =============================================================================
// HELPER ACTION CREATORS
// =============================================================================

/**
 * Show a success notification
 */
export const showSuccessNotification = (title: string, message?: string, duration?: number) =>
  uiActions.addNotification({ type: 'success', title, message, duration })

/**
 * Show an error notification
 */
export const showErrorNotification = (title: string, message?: string, duration?: number) =>
  uiActions.addNotification({ type: 'error', title, message, duration })

/**
 * Show a warning notification
 */
export const showWarningNotification = (title: string, message?: string, duration?: number) =>
  uiActions.addNotification({ type: 'warning', title, message, duration })

/**
 * Show an info notification
 */
export const showInfoNotification = (title: string, message?: string, duration?: number) =>
  uiActions.addNotification({ type: 'info', title, message, duration }) 