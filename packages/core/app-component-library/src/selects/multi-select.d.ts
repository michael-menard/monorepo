import * as React from 'react'
export interface MultiSelectOption {
  value: string
  label: string
  disabled?: boolean
}
export interface MultiSelectProps {
  options: MultiSelectOption[]
  selectedValues: string[]
  onSelectionChange: (values: string[]) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  maxDisplayed?: number
  showClearButton?: boolean
  searchable?: boolean
  label?: string
  description?: string
  error?: string
  required?: boolean
  invalid?: boolean
}
declare const MultiSelect: React.ForwardRefExoticComponent<
  MultiSelectProps & React.RefAttributes<HTMLDivElement>
>
export { MultiSelect }
//# sourceMappingURL=multi-select.d.ts.map
