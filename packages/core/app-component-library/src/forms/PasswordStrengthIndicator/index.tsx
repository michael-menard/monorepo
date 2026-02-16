/**
 * Password Strength Indicator Component
 *
 * Displays a 5-bar visual indicator of password strength with color coding:
 * - Red (Weak): Score 0
 * - Orange (Fair): Score 1
 * - Yellow (Good): Score 2
 * - Lime (Strong): Score 3
 * - Green (Very Strong): Score 4
 *
 * Updates in real-time as user types.
 */

import { cn } from '../../_lib/utils'
import type { PasswordStrengthIndicatorProps } from './__types__'
import { getPasswordStrength } from './utils/getPasswordStrength'

export function PasswordStrengthIndicator({
  password,
  showLabel = true,
  className,
}: PasswordStrengthIndicatorProps) {
  const strength = getPasswordStrength(password)

  if (!password) return null

  return (
    <div className={cn('space-y-1', className)} data-testid="password-strength-indicator">
      <div className="flex gap-1">
        {[0, 1, 2, 3, 4].map(i => (
          <div
            key={i}
            className={cn(
              'h-1 flex-1 rounded transition-colors duration-200',
              i <= strength.score
                ? strength.color === 'red'
                  ? 'bg-red-500'
                  : strength.color === 'orange'
                    ? 'bg-orange-500'
                    : strength.color === 'yellow'
                      ? 'bg-yellow-500'
                      : strength.color === 'lime'
                        ? 'bg-lime-500'
                        : 'bg-green-500'
                : 'bg-gray-200',
            )}
          />
        ))}
      </div>
      {showLabel ? (
        <p className="text-xs text-muted-foreground">Password strength: {strength.label}</p>
      ) : null}
    </div>
  )
}

export { getPasswordStrength } from './utils/getPasswordStrength'
export type { PasswordStrengthIndicatorProps } from './__types__'
