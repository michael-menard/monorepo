import { cn } from '@repo/ui'

interface PasswordStrength {
  score: number // 0-4
  label: string
  color: string
}

const getPasswordStrength = (password: string): PasswordStrength => {
  let score = 0

  if (password.length >= 8) score++
  if (password.length >= 12) score++
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++

  const labels = ['Weak', 'Fair', 'Good', 'Strong', 'Very Strong']
  const colors = ['red', 'orange', 'yellow', 'lime', 'green']

  const normalizedScore = Math.min(score, 4)

  return {
    score: normalizedScore,
    label: labels[normalizedScore],
    color: colors[normalizedScore],
  }
}

interface PasswordStrengthIndicatorProps {
  password: string
  className?: string
  'data-testid'?: string
}

export const PasswordStrengthIndicator = ({
  password,
  className,
  'data-testid': testId = 'password-strength',
}: PasswordStrengthIndicatorProps) => {
  const strength = getPasswordStrength(password)

  if (!password) {
    return null
  }

  // Map color names to Tailwind classes
  const colorClasses: Record<string, string> = {
    red: 'bg-red-500',
    orange: 'bg-orange-500',
    yellow: 'bg-yellow-500',
    lime: 'bg-lime-500',
    green: 'bg-green-500',
  }

  return (
    <div className={cn('space-y-1', className)} data-testid={testId}>
      <div
        className="flex gap-1"
        role="progressbar"
        aria-valuenow={strength.score}
        aria-valuemin={0}
        aria-valuemax={4}
        aria-label={`Password strength: ${strength.label}`}
      >
        {[0, 1, 2, 3, 4].map(i => (
          <div
            key={i}
            className={cn(
              'h-1 flex-1 rounded transition-colors duration-200',
              i <= strength.score ? colorClasses[strength.color] : 'bg-gray-200',
            )}
            data-testid={`${testId}-bar-${i}`}
          />
        ))}
      </div>
      <p className="text-xs text-muted-foreground" data-testid={`${testId}-label`}>
        Password strength: <span className="font-medium">{strength.label}</span>
      </p>
    </div>
  )
}

export { getPasswordStrength }
export type { PasswordStrength }
