import React, { useState } from 'react';
import { LegoCategoryEnum } from '../schemas/index.js';

export interface CategoryFilterProps {
  value: string | null;
  onChange: (category: string | null) => void;
  allowCustom?: boolean;
}

const predefinedCategories = LegoCategoryEnum.options as readonly string[];

export const CategoryFilter: React.FC<CategoryFilterProps> = ({ value, onChange, allowCustom = true }) => {
  const [custom, setCustom] = useState('');

  return (
    <div className="flex items-center gap-2 mb-4">
      <label htmlFor="category-filter" className="font-medium text-sm text-gray-700">Category:</label>
      <select
        id="category-filter"
        className="border rounded px-2 py-1 text-sm"
        value={predefinedCategories.includes((value || '') as string) ? value || '' : ''}
        onChange={e => {
          const val = e.target.value;
          if (val === '') onChange(null);
          else onChange(val);
        }}
      >
        <option value="">All</option>
        {predefinedCategories.map(cat => (
          <option key={cat} value={cat}>{cat}</option>
        ))}
      </select>
      {allowCustom && (
        <>
          <span className="text-gray-400 text-xs">or</span>
          <input
            type="text"
            placeholder="Custom category"
            className="border rounded px-2 py-1 text-sm"
            value={!predefinedCategories.includes((value || '') as string) ? value || custom : ''}
            onChange={e => {
              setCustom(e.target.value);
              onChange(e.target.value || null);
            }}
            aria-label="Custom category"
          />
        </>
      )}
      {value && (
        <button
          type="button"
          className="ml-2 text-xs text-gray-500 hover:text-red-500"
          onClick={() => { setCustom(''); onChange(null); }}
          aria-label="Clear category filter"
        >
          Clear
        </button>
      )}
    </div>
  );
};

export default CategoryFilter; 