/**
 * Compression Presets
 *
 * Story WISH-2046: Client-side Image Compression Quality Presets
 * Story WISH-2058: Core WebP Conversion
 */

import type { CompressionPreset, CompressionPresetName, CompressionConfig } from './__types__'

/**
 * WISH-2046: Compression quality presets
 * WISH-2058: Updated to WebP format for 25-35% additional size savings
 * - Low bandwidth: Smallest file size, fastest upload (0.6 quality, 1200px max, ~200KB)
 * - Balanced: Good quality, reasonable file size - recommended (0.8 quality, 1920px max, ~550KB)
 * - High quality: Best quality, larger file size (0.9 quality, 2400px max, ~1.0MB)
 */
export const COMPRESSION_PRESETS: CompressionPreset[] = [
  {
    name: 'low-bandwidth',
    label: 'Low bandwidth',
    description: 'Smallest file size, fastest upload',
    settings: {
      maxSizeMB: 0.5,
      maxWidthOrHeight: 1200,
      initialQuality: 0.6,
      useWebWorker: true,
      fileType: 'image/webp',
    },
    estimatedSize: '~200KB',
  },
  {
    name: 'balanced',
    label: 'Balanced',
    description: 'Good quality, reasonable file size',
    settings: {
      maxSizeMB: 1,
      maxWidthOrHeight: 1920,
      initialQuality: 0.8,
      useWebWorker: true,
      fileType: 'image/webp',
    },
    estimatedSize: '~550KB',
  },
  {
    name: 'high-quality',
    label: 'High quality',
    description: 'Best quality, larger file size',
    settings: {
      maxSizeMB: 2,
      maxWidthOrHeight: 2400,
      initialQuality: 0.9,
      useWebWorker: true,
      fileType: 'image/webp',
    },
    estimatedSize: '~1.0MB',
  },
]

/**
 * WISH-2046: Get a compression preset by name
 * Falls back to 'balanced' if name is invalid
 */
export function getPresetByName(name: CompressionPresetName | string): CompressionPreset {
  const preset = COMPRESSION_PRESETS.find(p => p.name === name)
  return preset ?? COMPRESSION_PRESETS[1] // Default to balanced (index 1)
}

/**
 * WISH-2046: Validate if a string is a valid preset name
 */
export function isValidPresetName(name: string): name is CompressionPresetName {
  return ['low-bandwidth', 'balanced', 'high-quality'].includes(name)
}

/**
 * Default compression settings per story AC (uses balanced preset)
 */
export const DEFAULT_COMPRESSION_CONFIG: CompressionConfig = COMPRESSION_PRESETS[1].settings
