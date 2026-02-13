/**
 * Sensor Configuration Utilities
 *
 * Default sensor configuration and helper to create dnd-kit sensors.
 * Story REPA-007: Generic, reusable drag-and-drop gallery component
 */

import { PointerSensor, TouchSensor } from '@dnd-kit/core'
import type { SensorConfig } from '../__types__'

/**
 * Default sensor configuration matching DraggableWishlistGallery
 * - PointerSensor: 8px activation distance
 * - TouchSensor: 300ms delay, 5px tolerance
 */
export const DEFAULT_SENSOR_CONFIG: Required<SensorConfig> = {
  pointerThreshold: 8,
  touchDelay: 300,
  touchTolerance: 5,
}

/**
 * Create dnd-kit sensors from configuration
 *
 * @param config - Sensor configuration
 * @returns Array of sensor configs to pass to useSensor
 */
export function createSensorsFromConfig(config: SensorConfig = DEFAULT_SENSOR_CONFIG) {
  const finalConfig = { ...DEFAULT_SENSOR_CONFIG, ...config }

  return [
    {
      sensor: PointerSensor,
      options: {
        activationConstraint: {
          distance: finalConfig.pointerThreshold,
        },
      },
    },
    {
      sensor: TouchSensor,
      options: {
        activationConstraint: {
          delay: finalConfig.touchDelay,
          tolerance: finalConfig.touchTolerance,
        },
      },
    },
  ]
}
