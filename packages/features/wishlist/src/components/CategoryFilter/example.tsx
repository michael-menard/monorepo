import React, { useState } from 'react'
import type { CategoryFilter as CategoryFilterType } from '../../schemas'
import CategoryFilter from './index'

const CategoryFilterExample: React.FC = () => {
  const [filter, setFilter] = useState<CategoryFilterType>({ category: undefined })
  const [customCategories, setCustomCategories] = useState<string[]>([])

  const handleFilterChange = (newFilter: CategoryFilterType) => {
    setFilter(newFilter)
    console.log('Filter changed:', newFilter)
  }

  const handleAddCustomCategory = (category: string) => {
    if (!customCategories.includes(category)) {
      setCustomCategories([...customCategories, category])
    }
  }

  return (
    <div className="p-6 max-w-md mx-auto">
      <h2 className="text-2xl font-bold mb-4">CategoryFilter Example</h2>

      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">Current Filter:</h3>
        <pre className="bg-gray-100 p-2 rounded text-sm">{JSON.stringify(filter, null, 2)}</pre>
      </div>

      <CategoryFilter
        filter={filter}
        onFilterChange={handleFilterChange}
        categories={customCategories}
        className="mb-4"
      />

      <div className="mt-6">
        <h3 className="text-lg font-semibold mb-2">Available Custom Categories:</h3>
        <ul className="list-disc list-inside">
          {customCategories.map(category => (
            <li key={category}>{category}</li>
          ))}
        </ul>
        {customCategories.length === 0 && (
          <p className="text-gray-500">No custom categories added yet.</p>
        )}
      </div>

      <div className="mt-6">
        <h3 className="text-lg font-semibold mb-2">Add Test Categories:</h3>
        <div className="flex gap-2 flex-wrap">
          {['Custom Set 1', 'MOC Project', 'Limited Edition'].map(category => (
            <button
              key={category}
              onClick={() => handleAddCustomCategory(category)}
              className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
            >
              Add {category}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default CategoryFilterExample
