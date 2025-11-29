import { createSlice, PayloadAction } from '@reduxjs/toolkit'

// State shape per story requirements
interface GlobalUIState {
  sidebar: {
    isOpen: boolean
    isCollapsed: boolean
  }
  loading: {
    isNavigating: boolean
    isPageLoading: boolean
  }
  modal: {
    activeModal: string | null
    modalProps: Record<string, unknown>
  }
}

const initialState: GlobalUIState = {
  sidebar: {
    isOpen: true,
    isCollapsed: false,
  },
  loading: {
    isNavigating: false,
    isPageLoading: false,
  },
  modal: {
    activeModal: null,
    modalProps: {},
  },
}

export const globalUISlice = createSlice({
  name: 'globalUI',
  initialState,
  reducers: {
    // Sidebar actions (AC: 2, 5)
    toggleSidebar: state => {
      state.sidebar.isOpen = !state.sidebar.isOpen
    },

    setSidebarOpen: (state, action: PayloadAction<boolean>) => {
      state.sidebar.isOpen = action.payload
    },

    setSidebarCollapsed: (state, action: PayloadAction<boolean>) => {
      state.sidebar.isCollapsed = action.payload
    },

    toggleSidebarCollapsed: state => {
      state.sidebar.isCollapsed = !state.sidebar.isCollapsed
    },

    // Loading actions (AC: 3, 5)
    setNavigating: (state, action: PayloadAction<boolean>) => {
      state.loading.isNavigating = action.payload
    },

    setPageLoading: (state, action: PayloadAction<boolean>) => {
      state.loading.isPageLoading = action.payload
    },

    // Modal actions (AC: 4, 5)
    openModal: (
      state,
      action: PayloadAction<{ name: string; props?: Record<string, unknown> }>,
    ) => {
      state.modal.activeModal = action.payload.name
      state.modal.modalProps = action.payload.props ?? {}
    },

    closeModal: state => {
      state.modal.activeModal = null
      state.modal.modalProps = {}
    },

    // Reset action for testing/cleanup
    resetGlobalUI: () => initialState,
  },
})

// Export actions (AC: 5)
export const {
  toggleSidebar,
  setSidebarOpen,
  setSidebarCollapsed,
  toggleSidebarCollapsed,
  setNavigating,
  setPageLoading,
  openModal,
  closeModal,
  resetGlobalUI,
} = globalUISlice.actions

// Selectors (AC: 6)
export const selectSidebarOpen = (state: { globalUI: GlobalUIState }) =>
  state.globalUI.sidebar.isOpen

export const selectSidebarCollapsed = (state: { globalUI: GlobalUIState }) =>
  state.globalUI.sidebar.isCollapsed

export const selectSidebar = (state: { globalUI: GlobalUIState }) => state.globalUI.sidebar

export const selectIsNavigating = (state: { globalUI: GlobalUIState }) =>
  state.globalUI.loading.isNavigating

export const selectIsPageLoading = (state: { globalUI: GlobalUIState }) =>
  state.globalUI.loading.isPageLoading

export const selectLoading = (state: { globalUI: GlobalUIState }) => state.globalUI.loading

export const selectActiveModal = (state: { globalUI: GlobalUIState }) =>
  state.globalUI.modal.activeModal

export const selectModalProps = (state: { globalUI: GlobalUIState }) =>
  state.globalUI.modal.modalProps

export const selectModal = (state: { globalUI: GlobalUIState }) => state.globalUI.modal

// Computed selector - is any loading state active
export const selectIsLoading = (state: { globalUI: GlobalUIState }) =>
  state.globalUI.loading.isNavigating || state.globalUI.loading.isPageLoading
