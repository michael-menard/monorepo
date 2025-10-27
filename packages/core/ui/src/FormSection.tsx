import React from 'react'
import {
  Label,
  Input,
  Textarea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './index'

export interface FormField {
  name: string
  label: string
  type: 'text' | 'textarea' | 'select' | 'number' | 'email' | 'url'
  placeholder?: string
  required?: boolean
  options?: Array<{ value: string; label: string }>
  value?: string | number
  onChange?: (value: string | number) => void
  error?: string
}

export interface FormSectionProps {
  title?: string
  description?: string
  fields: Array<FormField>
  className?: string
}

export const FormSection: React.FC<FormSectionProps> = ({
  title,
  description,
  fields,
  className = '',
}) => {
  const renderField = (field: FormField) => {
    const commonProps = {
      id: field.name,
      placeholder: field.placeholder,
      value: field.value || '',
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        field.onChange?.(e.target.value),
      className: field.error ? 'border-red-500' : '',
    }

    switch (field.type) {
      case 'textarea':
        return <Textarea {...commonProps} />
      case 'select':
        return (
          <Select value={field.value as string} onValueChange={field.onChange}>
            <SelectTrigger className={field.error ? 'border-red-500' : ''}>
              <SelectValue placeholder={field.placeholder} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )
      default:
        return <Input {...commonProps} type={field.type} />
    }
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {title || description ? (
        <div className="space-y-2">
          {title ? <h3 className="text-lg font-semibold text-gray-900">{title}</h3> : null}
          {description ? <p className="text-sm text-gray-600">{description}</p> : null}
        </div>
      ) : null}

      <div className="space-y-4">
        {fields.map(field => (
          <div key={field.name} className="space-y-2">
            <Label htmlFor={field.name} className="text-sm font-medium text-gray-700">
              {field.label}
              {field.required ? <span className="text-red-500 ml-1">*</span> : null}
            </Label>
            {renderField(field)}
            {field.error ? <p className="text-sm text-red-600">{field.error}</p> : null}
          </div>
        ))}
      </div>
    </div>
  )
}
