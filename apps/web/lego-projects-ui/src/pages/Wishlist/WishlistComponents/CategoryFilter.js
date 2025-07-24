import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
// @ts-expect-error: TypeScript cannot resolve .js import for WishlistSchemas, but it exists and is correct for NodeNext/ESM
import { LegoCategoryEnum } from '../../WishlistSchemas/index.js';
const predefinedCategories = LegoCategoryEnum.options;
export const CategoryFilter = ({ value, onChange, allowCustom = true }) => {
    const [custom, setCustom] = useState('');
    return (_jsxs("div", { className: "flex items-center gap-2 mb-4", children: [_jsx("label", { htmlFor: "category-filter", className: "font-medium text-sm text-gray-700", children: "Category:" }), _jsxs("select", { id: "category-filter", className: "border rounded px-2 py-1 text-sm", value: predefinedCategories.includes((value || '')) ? value || '' : '', onChange: e => {
                    const val = e.target.value;
                    if (val === '')
                        onChange(null);
                    else
                        onChange(val);
                }, children: [_jsx("option", { value: "", children: "All" }), predefinedCategories.map(cat => (_jsx("option", { value: cat, children: cat }, cat)))] }), allowCustom && (_jsxs(_Fragment, { children: [_jsx("span", { className: "text-gray-400 text-xs", children: "or" }), _jsx("input", { type: "text", placeholder: "Custom category", className: "border rounded px-2 py-1 text-sm", value: !predefinedCategories.includes((value || '')) ? value || custom : '', onChange: e => {
                            setCustom(e.target.value);
                            onChange(e.target.value || null);
                        }, "aria-label": "Custom category" })] })), value && (_jsx("button", { type: "button", className: "ml-2 text-xs text-gray-500 hover:text-red-500", onClick: () => { setCustom(''); onChange(null); }, "aria-label": "Clear category filter", children: "Clear" }))] }));
};
export default CategoryFilter;
