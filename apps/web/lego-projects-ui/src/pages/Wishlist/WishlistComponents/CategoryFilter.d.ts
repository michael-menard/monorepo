import React from 'react';
export interface CategoryFilterProps {
    value: string | null;
    onChange: (category: string | null) => void;
    allowCustom?: boolean;
}
export declare const CategoryFilter: React.FC<CategoryFilterProps>;
export default CategoryFilter;
