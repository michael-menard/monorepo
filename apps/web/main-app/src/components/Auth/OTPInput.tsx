import React, { useEffect, useRef } from 'react'
import { Input, cn } from '@repo/app-component-library'

interface OTPInputProps {
  value: string
  onChange: (value: string) => void
  length?: number
  disabled?: boolean
  error?: boolean
  className?: string
  autoFocus?: boolean
  'data-testid'?: string
}

export const OTPInput: React.FC<OTPInputProps> = ({
  value,
  onChange,
  length = 6,
  disabled = false,
  error = false,
  className,
  autoFocus = true,
  'data-testid': testId,
}) => {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])
  const values = value.split('').slice(0, length)

  // Pad with empty strings if needed
  while (values.length < length) {
    values.push('')
  }

  useEffect(() => {
    if (autoFocus) {
      // Focus first empty input
      const firstEmptyIndex = values.findIndex(v => !v)
      const targetIndex = firstEmptyIndex >= 0 ? firstEmptyIndex : 0
      inputRefs.current[targetIndex]?.focus()
    }
  }, [values, autoFocus])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace') {
      e.preventDefault()
      const newValues = [...values]

      if (values[index]) {
        // Clear current input
        newValues[index] = ''
        onChange(newValues.join(''))
      } else if (index > 0) {
        // Move to previous input and clear it
        newValues[index - 1] = ''
        onChange(newValues.join(''))
        inputRefs.current[index - 1]?.focus()
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus()
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>, index: number) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text/plain').replace(/\D/g, '')

    if (pastedData) {
      const newValues = [...values]
      const pastedChars = pastedData.split('').slice(0, length - index)

      pastedChars.forEach((char, i) => {
        if (index + i < length) {
          newValues[index + i] = char
        }
      })

      onChange(newValues.join(''))

      // Focus next empty input or last input
      const nextIndex = Math.min(index + pastedChars.length, length - 1)
      inputRefs.current[nextIndex]?.focus()
    }
  }

  const handleInput = (e: React.FormEvent<HTMLInputElement>, index: number) => {
    const input = e.currentTarget
    const originalValue = input.value
    const inputValue = originalValue.replace(/\D/g, '') // Only allow digits

    // Only proceed if the input was valid (no non-numeric characters were removed)
    if (originalValue === inputValue) {
      if (inputValue.length <= 1) {
        const newValues = [...values]
        newValues[index] = inputValue
        onChange(newValues.join(''))

        // Move to next input if value was entered
        if (inputValue && index < length - 1) {
          inputRefs.current[index + 1]?.focus()
        }
      }
    } else {
      // Reset the input value to what it was before the invalid character
      input.value = values[index] || ''
    }
  }

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.select()
  }

  return (
    <div className={cn('flex gap-2 justify-center', className)} data-testid={testId}>
      {values.map((digit, index) => (
        <Input
          key={index}
          ref={el => {
            inputRefs.current[index] = el
          }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          value={digit}
          onChange={() => {}} // Handled by onInput
          onInput={e => handleInput(e, index)}
          onKeyDown={e => handleKeyDown(e, index)}
          onPaste={e => handlePaste(e, index)}
          onFocus={handleFocus}
          disabled={disabled}
          className={cn(
            'w-12 h-12 text-center text-xl font-bold',
            'focus:ring-2 focus:ring-primary focus:border-transparent',
            'transition-all duration-200',
            error && 'border-red-500 focus:ring-red-500',
            disabled && 'opacity-50 cursor-not-allowed',
          )}
          aria-label={`Verification code digit ${index + 1}`}
          data-testid={testId ? `${testId}-input-${index}` : undefined}
        />
      ))}
    </div>
  )
}
