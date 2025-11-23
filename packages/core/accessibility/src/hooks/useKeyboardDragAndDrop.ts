import React, { useCallback, useEffect, useRef, useState } from 'react'
import { z } from 'zod'

// Schema for keyboard drag and drop data
export const KeyboardDragDropDataSchema = z.object({
  type: z.string(),
  itemId: z.string(),
  sourceIndex: z.number().int().min(0),
  source: z.string().optional(),
})

export type KeyboardDragDropData = z.infer<typeof KeyboardDragDropDataSchema>

// Zod schemas for type safety and validation
export const keyboardDragStateSchema = z.object({
  isKeyboardDragging: z.boolean(),
  draggedItemId: z.string().nullable(),
  sourceIndex: z.number().nullable(),
  targetIndex: z.number().nullable(),
  isFocused: z.boolean(),
  totalItems: z.number(),
})

export const useKeyboardDragAndDropOptionsSchema = z.object({
  totalItems: z.number(),
  onReorder: z.function().args(z.number(), z.number()).returns(z.void()).optional(),
  onMove: z.function().args(z.string(), z.number(), z.number()).returns(z.void()).optional(),
  onCancel: z.function().returns(z.void()).optional(),
  onConfirm: z.function().returns(z.void()).optional(),
  itemType: z.string().optional(),
})

// Inferred types from Zod schemas
export type KeyboardDragState = z.infer<typeof keyboardDragStateSchema>
export type UseKeyboardDragAndDropOptions = z.infer<typeof useKeyboardDragAndDropOptionsSchema>

// Actions interface (keeping as interface since it's a return type with functions)
export interface KeyboardDragActions {
  handleKeyDown: (e: React.KeyboardEvent, itemId: string, index: number) => void
  handleFocus: (index: number) => void
  handleBlur: () => void
  handleMoveUp: () => void
  handleMoveDown: () => void
  handleMoveToTop: () => void
  handleMoveToBottom: () => void
  handleCancel: () => void
  handleConfirm: () => void
  getKeyboardInstructions: () => string
}

export const useKeyboardDragAndDrop = ({
  totalItems,
  onReorder,
  onMove,
  onCancel,
  onConfirm,
  itemType = 'item',
}: UseKeyboardDragAndDropOptions): [KeyboardDragState, KeyboardDragActions] => {
  const [state, setState] = useState<KeyboardDragState>({
    isKeyboardDragging: false,
    draggedItemId: null,
    sourceIndex: null,
    targetIndex: null,
    isFocused: false,
    totalItems,
  })

  const focusedIndexRef = useRef<number>(-1)
  const draggedItemIdRef = useRef<string | null>(null)
  const sourceIndexRef = useRef<number>(-1)

  const resetState = useCallback(() => {
    setState({
      isKeyboardDragging: false,
      draggedItemId: null,
      sourceIndex: null,
      targetIndex: null,
      isFocused: false,
      totalItems,
    })
    focusedIndexRef.current = -1
    draggedItemIdRef.current = null
    sourceIndexRef.current = -1
  }, [])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, itemId: string, index: number) => {
      const { key } = e

      // Enter or Space to start dragging
      if ((key === 'Enter' || key === ' ') && !state.isKeyboardDragging) {
        e.preventDefault()
        setState({
          isKeyboardDragging: true,
          draggedItemId: itemId,
          sourceIndex: index,
          targetIndex: index,
          isFocused: true,
          totalItems,
        })
        focusedIndexRef.current = index
        draggedItemIdRef.current = itemId
        sourceIndexRef.current = index
        return
      }

      // If not dragging, handle navigation
      if (!state.isKeyboardDragging) {
        if (key === 'ArrowUp' || key === 'ArrowDown' || key === 'Home' || key === 'End') {
          e.preventDefault()
          const newIndex =
            key === 'ArrowUp'
              ? Math.max(0, index - 1)
              : key === 'ArrowDown'
                ? Math.min(totalItems - 1, index + 1)
                : key === 'Home'
                  ? 0
                  : totalItems - 1

          setState(prev => ({ ...prev, isFocused: true }))
          focusedIndexRef.current = newIndex
        }
        return
      }

      // Handle dragging operations
      e.preventDefault()

      switch (key) {
        case 'ArrowUp':
          setState(prev => {
            if (prev.targetIndex !== null && prev.targetIndex > 0) {
              return { ...prev, targetIndex: prev.targetIndex - 1 }
            }
            return prev
          })
          break

        case 'ArrowDown':
          setState(prev => {
            if (prev.targetIndex !== null && prev.targetIndex < totalItems - 1) {
              return { ...prev, targetIndex: prev.targetIndex + 1 }
            }
            return prev
          })
          break

        case 'Home':
          setState(prev => ({ ...prev, targetIndex: 0 }))
          break

        case 'End':
          setState(prev => ({ ...prev, targetIndex: totalItems - 1 }))
          break

        case 'Enter':
        case ' ':
          // Confirm the move
          if (state.sourceIndex !== null && state.targetIndex !== null && state.draggedItemId) {
            if (state.sourceIndex !== state.targetIndex) {
              onReorder?.(state.sourceIndex, state.targetIndex)
              onMove?.(state.draggedItemId, state.sourceIndex, state.targetIndex)
            }
            onConfirm?.()
            resetState()
          }
          break

        case 'Escape':
          // Cancel the operation
          onCancel?.()
          resetState()
          break

        case 'Tab':
          // Allow normal tab navigation but reset dragging state
          resetState()
          break
      }
    },
    [state, totalItems, onReorder, onMove, onCancel, onConfirm, resetState],
  )

  const handleFocus = useCallback(
    (index: number) => {
      if (!state.isKeyboardDragging) {
        setState(prev => ({ ...prev, isFocused: true }))
        focusedIndexRef.current = index
      }
    },
    [state.isKeyboardDragging],
  )

  const handleBlur = useCallback(() => {
    if (!state.isKeyboardDragging) {
      setState(prev => ({ ...prev, isFocused: false }))
    }
  }, [state.isKeyboardDragging])

  const handleMoveUp = useCallback(() => {
    setState(prev => {
      if (prev.targetIndex !== null && prev.targetIndex > 0) {
        return { ...prev, targetIndex: prev.targetIndex - 1 }
      }
      return prev
    })
  }, [])

  const handleMoveDown = useCallback(() => {
    setState(prev => {
      if (prev.targetIndex !== null && prev.targetIndex < totalItems - 1) {
        return { ...prev, targetIndex: prev.targetIndex + 1 }
      }
      return prev
    })
  }, [totalItems])

  const handleMoveToTop = useCallback(() => {
    setState(prev => ({ ...prev, targetIndex: 0 }))
  }, [])

  const handleMoveToBottom = useCallback(() => {
    setState(prev => ({ ...prev, targetIndex: totalItems - 1 }))
  }, [totalItems])

  const handleCancel = useCallback(() => {
    onCancel?.()
    resetState()
  }, [onCancel, resetState])

  const handleConfirm = useCallback(() => {
    setState(prev => {
      if (prev.sourceIndex !== null && prev.targetIndex !== null && prev.draggedItemId) {
        if (prev.sourceIndex !== prev.targetIndex) {
          onReorder?.(prev.sourceIndex, prev.targetIndex)
          onMove?.(prev.draggedItemId, prev.sourceIndex, prev.targetIndex)
        }
        onConfirm?.()
      }
      return prev
    })
  }, [onReorder, onMove, onConfirm])

  const getKeyboardInstructions = useCallback(() => {
    if (state.isKeyboardDragging) {
      return `Moving ${itemType}. Use arrow keys to select position, Enter to confirm, Escape to cancel. Current position: ${state.targetIndex !== null ? state.targetIndex + 1 : 'unknown'} of ${totalItems}`
    }
    return `Press Enter or Space to start moving this ${itemType}. Use arrow keys to navigate.`
  }, [state.isKeyboardDragging, state.targetIndex, totalItems, itemType])

  // Auto-reset on unmount
  useEffect(() => {
    return () => {
      resetState()
    }
  }, [resetState])

  return [
    state,
    {
      handleKeyDown,
      handleFocus,
      handleBlur,
      handleMoveUp,
      handleMoveDown,
      handleMoveToTop,
      handleMoveToBottom,
      handleCancel,
      handleConfirm,
      getKeyboardInstructions,
    },
  ]
}
