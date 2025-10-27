import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useDragAndDrop } from '../useDragAndDrop.js'
import { createMockDragEvent } from '../../__tests__/test-utils.js'
import { fileFixtures } from '../../__tests__/fixtures.js'

describe('useDragAndDrop', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('initialization', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useDragAndDrop())

      expect(result.current.isDragActive).toBe(false)
      expect(result.current.isDragAccept).toBe(false)
      expect(result.current.isDragReject).toBe(false)
    })

    it('should accept onFilesDropped callback', () => {
      const onFilesDropped = vi.fn()
      const { result } = renderHook(() => useDragAndDrop({ onFilesDropped }))

      expect(result.current.isDragActive).toBe(false)
    })

    it('should provide root and input props', () => {
      const { result } = renderHook(() => useDragAndDrop())

      expect(typeof result.current.getRootProps).toBe('function')
      expect(typeof result.current.getInputProps).toBe('function')
      expect(typeof result.current.open).toBe('function')
    })
  })

  describe('drag events', () => {
    it('should handle drag enter', () => {
      const { result } = renderHook(() => useDragAndDrop())

      const dragEvent = createMockDragEvent('dragenter', [fileFixtures.jpegImage])

      act(() => {
        result.current.getRootProps().onDragEnter(dragEvent)
      })

      expect(result.current.isDragActive).toBe(true)
    })

    it('should handle drop event', () => {
      const onFilesDropped = vi.fn()
      const { result } = renderHook(() => useDragAndDrop({ onFilesDropped }))

      const dropEvent = createMockDragEvent('drop', [fileFixtures.jpegImage, fileFixtures.pngImage])

      act(() => {
        result.current.getRootProps().onDrop(dropEvent)
      })

      expect(result.current.isDragActive).toBe(false)
      expect(onFilesDropped).toHaveBeenCalledWith([fileFixtures.jpegImage, fileFixtures.pngImage])
    })
  })

  describe('input props', () => {
    it('should provide input props for file input', () => {
      const { result } = renderHook(() => useDragAndDrop())

      const inputProps = result.current.getInputProps()

      expect(inputProps).toHaveProperty('type', 'file')
      expect(inputProps).toHaveProperty('onChange')
      expect(inputProps).toHaveProperty('multiple')
      expect(inputProps.style).toEqual({ display: 'none' })
    })

    it('should handle file input change', () => {
      const onFilesDropped = vi.fn()
      const { result } = renderHook(() => useDragAndDrop({ onFilesDropped }))

      const inputProps = result.current.getInputProps()
      const mockEvent = {
        target: {
          files: [fileFixtures.jpegImage, fileFixtures.pngImage],
        },
      } as any

      act(() => {
        inputProps.onChange(mockEvent)
      })

      expect(onFilesDropped).toHaveBeenCalledWith([fileFixtures.jpegImage, fileFixtures.pngImage])
    })
  })
})
