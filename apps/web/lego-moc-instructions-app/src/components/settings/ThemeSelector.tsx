import React from 'react'
import { Button } from '@repo/ui'
import { useTheme } from '@repo/ui'
import { Moon, Sun, Monitor, Check } from 'lucide-react'

type Theme = 'light' | 'dark' | 'system'

interface ThemeOption {
  value: Theme
  label: string
  description: string
  icon: React.ComponentType<{ className?: string }>
}

const themeOptions: ThemeOption[] = [
  {
    value: 'light',
    label: 'Light',
    description: 'Clean and bright interface',
    icon: Sun
  },
  {
    value: 'dark',
    label: 'Dark',
    description: 'Easy on the eyes in low light',
    icon: Moon
  },
  {
    value: 'system',
    label: 'System',
    description: 'Matches your device settings',
    icon: Monitor
  }
]

interface ThemeSelectorProps {
  className?: string
}

export const ThemeSelector: React.FC<ThemeSelectorProps> = ({ className = '' }) => {
  const { theme, setTheme } = useTheme()

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="grid gap-3">
        {themeOptions.map((option) => {
          const Icon = option.icon
          const isSelected = theme === option.value
          
          return (
            <Button
              key={option.value}
              variant={isSelected ? 'default' : 'outline'}
              className={`h-auto p-4 justify-start text-left ${
                isSelected ? 'ring-2 ring-primary ring-offset-2' : ''
              }`}
              onClick={() => setTheme(option.value)}
            >
              <div className="flex items-center space-x-3 w-full">
                <Icon className="h-5 w-5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{option.label}</span>
                    {isSelected && <Check className="h-4 w-4 flex-shrink-0" />}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {option.description}
                  </p>
                </div>
              </div>
            </Button>
          )
        })}
      </div>
    </div>
  )
}

export default ThemeSelector
