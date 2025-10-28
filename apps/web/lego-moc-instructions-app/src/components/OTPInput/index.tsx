import React, { useEffect, useRef } from 'react'
import { Input, cn } from '@repo/ui'

interface OTPInputProps {
  value: string
  onChange: (value: string) => void
  length?: number
  disabled?: boolean
  error?: boolean
  className?: string
  autoFocus?: boolean
}

export const OTPInput: React.FC<OTPInputProps> = ({
  value,
  onChange,
  length = 6,
  disabled = false,
  error = false,
  className,
  autoFocus = true,
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

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text/plain').replace(/\D/g, '')

    if (pastedData.length > 0) {
      const newValue = pastedData.slice(0, length)
      onChange(newValue)

      // Focus the next empty input or the last input
      const nextIndex = Math.min(newValue.length, length - 1)
      setTimeout(() => {
        inputRefs.current[nextIndex]?.focus()
      }, 0)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'Backspace') {
      e.preventDefault()
      const newValues = [...values]

      if (values[index]) {
        // Clear current input
        newValues[index] = ''
      } else if (index > 0) {
        // Move to previous input and clear it
        newValues[index - 1] = ''
        inputRefs.current[index - 1]?.focus()
      }

      onChange(newValues.join(''))
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus()
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleInput = (e: React.FormEvent<HTMLInputElement>, index: number) => {
    const input = e.currentTarget
    const inputValue = input.value.replace(/\D/g, '') // Only allow digits

    if (inputValue.length <= 1) {
      const newValues = [...values]
      newValues[index] = inputValue
      onChange(newValues.join(''))

      // Move to next input if value was entered
      if (inputValue && index < length - 1) {
        inputRefs.current[index + 1]?.focus()
      }
    }
  }

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.select()
  }

  return (
    <div className={cn('flex gap-2 justify-center', className)}>
      {values.map((digit, index) => (
        <Input
          key={index}
          ref={el => (inputRefs.current[index] = el)}
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
        />
      ))}
    </div>
  )
}

export default OTPInput
