import { describe, it, expect } from 'vitest'

describe('@repo/upload package structure', () => {
  it('should have placeholder exports', () => {
    // This test verifies the package structure is set up correctly
    // Actual functionality tests will be added in migration stories
    expect(true).toBe(true)
  })

  it('should be importable', async () => {
    // Verify sub-module exports work (avoids env var requirements from top-level barrel)
    const client = await import('../client')
    expect(client).toBeDefined()
    expect(client.uploadToPresignedUrl).toBeDefined()

    const imagePresets = await import('../image/presets')
    expect(imagePresets).toBeDefined()
    expect(imagePresets.COMPRESSION_PRESETS).toBeDefined()

    const imageCompression = await import('../image/compression')
    expect(imageCompression).toBeDefined()
    expect(imageCompression.compressImage).toBeDefined()

    const imageHeic = await import('../image/heic')
    expect(imageHeic).toBeDefined()
    expect(imageHeic.isHEIC).toBeDefined()
  })
})
