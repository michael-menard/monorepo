import { describe, it, expect, beforeEach } from 'vitest'
import { configureStore, EnhancedStore } from '@reduxjs/toolkit'
import {
  globalUISlice,
  toggleSidebar,
  setSidebarOpen,
  setSidebarCollapsed,
  toggleSidebarCollapsed,
  setNavigating,
  setPageLoading,
  openModal,
  closeModal,
  resetGlobalUI,
  selectSidebarOpen,
  selectSidebarCollapsed,
  selectSidebar,
  selectIsNavigating,
  selectIsPageLoading,
  selectLoading,
  selectActiveModal,
  selectModalProps,
  selectModal,
  selectIsLoading,
} from '../globalUISlice'

// Type for test store state
interface TestRootState {
  globalUI: ReturnType<typeof globalUISlice.getInitialState>
}

const createTestStore = () =>
  configureStore({
    reducer: {
      globalUI: globalUISlice.reducer,
    },
  })

describe('globalUISlice', () => {
  let store: EnhancedStore<TestRootState>

  beforeEach(() => {
    store = createTestStore()
  })

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const state = store.getState()

      expect(selectSidebarOpen(state)).toBe(true)
      expect(selectSidebarCollapsed(state)).toBe(false)
      expect(selectIsNavigating(state)).toBe(false)
      expect(selectIsPageLoading(state)).toBe(false)
      expect(selectActiveModal(state)).toBeNull()
      expect(selectModalProps(state)).toEqual({})
    })

    it('should have correct sidebar initial state', () => {
      const state = store.getState()
      const sidebar = selectSidebar(state)

      expect(sidebar).toEqual({
        isOpen: true,
        isCollapsed: false,
      })
    })

    it('should have correct loading initial state', () => {
      const state = store.getState()
      const loading = selectLoading(state)

      expect(loading).toEqual({
        isNavigating: false,
        isPageLoading: false,
      })
    })

    it('should have correct modal initial state', () => {
      const state = store.getState()
      const modal = selectModal(state)

      expect(modal).toEqual({
        activeModal: null,
        modalProps: {},
      })
    })
  })

  describe('sidebar actions', () => {
    describe('toggleSidebar', () => {
      it('should toggle sidebar from open to closed', () => {
        store.dispatch(toggleSidebar())
        const state = store.getState()

        expect(selectSidebarOpen(state)).toBe(false)
      })

      it('should toggle sidebar from closed to open', () => {
        store.dispatch(toggleSidebar()) // close
        store.dispatch(toggleSidebar()) // open
        const state = store.getState()

        expect(selectSidebarOpen(state)).toBe(true)
      })
    })

    describe('setSidebarOpen', () => {
      it('should set sidebar to closed', () => {
        store.dispatch(setSidebarOpen(false))
        const state = store.getState()

        expect(selectSidebarOpen(state)).toBe(false)
      })

      it('should set sidebar to open', () => {
        store.dispatch(setSidebarOpen(false))
        store.dispatch(setSidebarOpen(true))
        const state = store.getState()

        expect(selectSidebarOpen(state)).toBe(true)
      })
    })

    describe('setSidebarCollapsed', () => {
      it('should set sidebar to collapsed', () => {
        store.dispatch(setSidebarCollapsed(true))
        const state = store.getState()

        expect(selectSidebarCollapsed(state)).toBe(true)
      })

      it('should set sidebar to expanded', () => {
        store.dispatch(setSidebarCollapsed(true))
        store.dispatch(setSidebarCollapsed(false))
        const state = store.getState()

        expect(selectSidebarCollapsed(state)).toBe(false)
      })
    })

    describe('toggleSidebarCollapsed', () => {
      it('should toggle sidebar collapsed state', () => {
        store.dispatch(toggleSidebarCollapsed())
        expect(selectSidebarCollapsed(store.getState())).toBe(true)

        store.dispatch(toggleSidebarCollapsed())
        expect(selectSidebarCollapsed(store.getState())).toBe(false)
      })
    })
  })

  describe('loading actions', () => {
    describe('setNavigating', () => {
      it('should set navigating to true', () => {
        store.dispatch(setNavigating(true))
        const state = store.getState()

        expect(selectIsNavigating(state)).toBe(true)
      })

      it('should set navigating to false', () => {
        store.dispatch(setNavigating(true))
        store.dispatch(setNavigating(false))
        const state = store.getState()

        expect(selectIsNavigating(state)).toBe(false)
      })
    })

    describe('setPageLoading', () => {
      it('should set page loading to true', () => {
        store.dispatch(setPageLoading(true))
        const state = store.getState()

        expect(selectIsPageLoading(state)).toBe(true)
      })

      it('should set page loading to false', () => {
        store.dispatch(setPageLoading(true))
        store.dispatch(setPageLoading(false))
        const state = store.getState()

        expect(selectIsPageLoading(state)).toBe(false)
      })
    })

    describe('selectIsLoading (computed)', () => {
      it('should return true when navigating', () => {
        store.dispatch(setNavigating(true))
        const state = store.getState()

        expect(selectIsLoading(state)).toBe(true)
      })

      it('should return true when page loading', () => {
        store.dispatch(setPageLoading(true))
        const state = store.getState()

        expect(selectIsLoading(state)).toBe(true)
      })

      it('should return true when both are loading', () => {
        store.dispatch(setNavigating(true))
        store.dispatch(setPageLoading(true))
        const state = store.getState()

        expect(selectIsLoading(state)).toBe(true)
      })

      it('should return false when nothing is loading', () => {
        const state = store.getState()

        expect(selectIsLoading(state)).toBe(false)
      })
    })
  })

  describe('modal actions', () => {
    describe('openModal', () => {
      it('should open modal with name', () => {
        store.dispatch(openModal({ name: 'confirm-delete' }))
        const state = store.getState()

        expect(selectActiveModal(state)).toBe('confirm-delete')
        expect(selectModalProps(state)).toEqual({})
      })

      it('should open modal with name and props', () => {
        const modalProps = { itemId: '123', title: 'Delete Item' }
        store.dispatch(openModal({ name: 'confirm-delete', props: modalProps }))
        const state = store.getState()

        expect(selectActiveModal(state)).toBe('confirm-delete')
        expect(selectModalProps(state)).toEqual(modalProps)
      })

      it('should replace existing modal', () => {
        store.dispatch(openModal({ name: 'modal-1', props: { id: 1 } }))
        store.dispatch(openModal({ name: 'modal-2', props: { id: 2 } }))
        const state = store.getState()

        expect(selectActiveModal(state)).toBe('modal-2')
        expect(selectModalProps(state)).toEqual({ id: 2 })
      })
    })

    describe('closeModal', () => {
      it('should close modal and clear props', () => {
        store.dispatch(openModal({ name: 'test-modal', props: { data: 'test' } }))
        store.dispatch(closeModal())
        const state = store.getState()

        expect(selectActiveModal(state)).toBeNull()
        expect(selectModalProps(state)).toEqual({})
      })

      it('should be safe to call when no modal is open', () => {
        store.dispatch(closeModal())
        const state = store.getState()

        expect(selectActiveModal(state)).toBeNull()
        expect(selectModalProps(state)).toEqual({})
      })
    })
  })

  describe('resetGlobalUI', () => {
    it('should reset all state to initial values', () => {
      // Modify all state
      store.dispatch(setSidebarOpen(false))
      store.dispatch(setSidebarCollapsed(true))
      store.dispatch(setNavigating(true))
      store.dispatch(setPageLoading(true))
      store.dispatch(openModal({ name: 'test', props: { key: 'value' } }))

      // Reset
      store.dispatch(resetGlobalUI())
      const state = store.getState()

      // Verify all reset
      expect(selectSidebarOpen(state)).toBe(true)
      expect(selectSidebarCollapsed(state)).toBe(false)
      expect(selectIsNavigating(state)).toBe(false)
      expect(selectIsPageLoading(state)).toBe(false)
      expect(selectActiveModal(state)).toBeNull()
      expect(selectModalProps(state)).toEqual({})
    })
  })

  describe('selectors', () => {
    it('selectSidebar should return sidebar state object', () => {
      store.dispatch(setSidebarOpen(false))
      store.dispatch(setSidebarCollapsed(true))
      const state = store.getState()

      expect(selectSidebar(state)).toEqual({
        isOpen: false,
        isCollapsed: true,
      })
    })

    it('selectLoading should return loading state object', () => {
      store.dispatch(setNavigating(true))
      store.dispatch(setPageLoading(true))
      const state = store.getState()

      expect(selectLoading(state)).toEqual({
        isNavigating: true,
        isPageLoading: true,
      })
    })

    it('selectModal should return modal state object', () => {
      const props = { id: 1, name: 'test' }
      store.dispatch(openModal({ name: 'test-modal', props }))
      const state = store.getState()

      expect(selectModal(state)).toEqual({
        activeModal: 'test-modal',
        modalProps: props,
      })
    })
  })
})
