import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useFileValidation } from '../useFileValidation.js'
import { fileFixtures, configFixtures } from '../../__tests__/fixtures.js'

describe('useFileValidation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('initialization', () => {
    it('should provide validation functions', () => {
      const { result } = renderHook(() => useFileValidation({ config: configFixtures.default }))

      expect(typeof result.current.validateFiles).toBe('function')
      expect(typeof result.current.validateFile).toBe('function')
    })
  })

  describe('file validation', () => {
    it('should validate single file successfully', () => {
      const { result } = renderHook(() => useFileValidation({ config: configFixtures.imagesOnly }))

      const errors = result.current.validateFile(fileFixtures.jpegImage)

      expect(errors).toEqual([])
    })

    it('should detect invalid file type', () => {
      const { result } = renderHook(() => useFileValidation({ config: configFixtures.imagesOnly }))

      const errors = result.current.validateFile(fileFixtures.executableFile)

      expect(errors).toHaveLength(1)
      expect(errors[0].code).toBe('INVALID_FILE_TYPE')
      expect(errors[0].file).toStrictEqual(fileFixtures.executableFile)
    })

    it('should detect file too large', () => {
      const { result } = renderHook(() => useFileValidation({ config: configFixtures.restrictive }))

      const errors = result.current.validateFile(fileFixtures.largeImage)

      expect(errors).toHaveLength(1)
      expect(errors[0].code).toBe('FILE_TOO_LARGE')
      expect(errors[0].file).toStrictEqual(fileFixtures.largeImage)
    })

    it('should validate multiple files', () => {
      const { result } = renderHook(() => useFileValidation({ config: configFixtures.imagesOnly }))

      const errors = result.current.validateFiles(fileFixtures.multipleImages)

      expect(errors).toEqual([])
    })

    it('should detect too many files', () => {
      const { result } = renderHook(() => useFileValidation({ config: configFixtures.restrictive }))

      const errors = result.current.validateFiles(fileFixtures.multipleImages)

      expect(errors).toHaveLength(1)
      expect(errors[0].code).toBe('TOO_MANY_FILES')
    })
  })

  describe('configuration updates', () => {
    it('should update validation when configuration changes', () => {
      const { result, rerender } = renderHook(({ config }) => useFileValidation({ config }), {
        initialProps: { config: configFixtures.imagesOnly },
      })

      // Initially should reject PDF for images-only config
      const pdfErrors1 = result.current.validateFile(fileFixtures.pdfDocument)
      expect(pdfErrors1).toHaveLength(1)

      // Change to document config
      rerender({ config: configFixtures.documents })

      // Now should accept PDF
      const pdfErrors2 = result.current.validateFile(fileFixtures.pdfDocument)
      expect(pdfErrors2).toEqual([])
    })
  })
})
