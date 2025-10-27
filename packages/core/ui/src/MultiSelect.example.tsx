import React, { useState } from 'react'
import { MultiSelect, MultiSelectOption } from './multi-select'

const MultiSelectExample: React.FC = () => {
  const [selectedValues, setSelectedValues] = useState<string[]>([])

  const options: MultiSelectOption[] = [
    { value: 'react', label: 'React' },
    { value: 'typescript', label: 'TypeScript' },
    { value: 'javascript', label: 'JavaScript' },
    { value: 'nodejs', label: 'Node.js' },
    { value: 'python', label: 'Python' },
    { value: 'java', label: 'Java' },
    { value: 'csharp', label: 'C#' },
    { value: 'go', label: 'Go' },
    { value: 'rust', label: 'Rust' },
    { value: 'php', label: 'PHP' },
    { value: 'ruby', label: 'Ruby' },
    { value: 'swift', label: 'Swift' },
    { value: 'kotlin', label: 'Kotlin' },
    { value: 'scala', label: 'Scala' },
    { value: 'elixir', label: 'Elixir' },
  ]

  const handleSelectionChange = (values: string[]) => {
    setSelectedValues(values)
    console.log('Selected values:', values)
  }

  return (
    <div className="space-y-6 p-6 max-w-md">
      <div>
        <h3 className="text-lg font-semibold mb-2">Basic MultiSelect</h3>
        <MultiSelect
          options={options}
          selectedValues={selectedValues}
          onSelectionChange={handleSelectionChange}
          placeholder="Select programming languages..."
        />
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-2">Searchable MultiSelect</h3>
        <MultiSelect
          options={options}
          selectedValues={selectedValues}
          onSelectionChange={handleSelectionChange}
          placeholder="Search and select languages..."
          searchable={true}
        />
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-2">MultiSelect with Custom Max Display</h3>
        <MultiSelect
          options={options}
          selectedValues={selectedValues}
          onSelectionChange={handleSelectionChange}
          placeholder="Select languages (max 2 displayed)..."
          maxDisplayed={2}
        />
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-2">MultiSelect without Clear Button</h3>
        <MultiSelect
          options={options}
          selectedValues={selectedValues}
          onSelectionChange={handleSelectionChange}
          placeholder="Select languages (no clear button)..."
          showClearButton={false}
        />
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-2">Disabled MultiSelect</h3>
        <MultiSelect
          options={options}
          selectedValues={selectedValues}
          onSelectionChange={handleSelectionChange}
          placeholder="This is disabled..."
          disabled={true}
        />
      </div>

      <div className="mt-4 p-4 bg-gray-50 rounded-md">
        <h4 className="font-medium mb-2">Selected Values:</h4>
        <pre className="text-sm text-gray-600">{JSON.stringify(selectedValues, null, 2)}</pre>
      </div>
    </div>
  )
}

export default MultiSelectExample
