import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useEffect } from 'react';
import CategoryFilter from '../../../../packages/wishlist/src/components/CategoryFilter';
import WishlistList from '../../../../packages/wishlist/src/components/WishlistList';
import { WishlistItem } from '../../../../packages/wishlist/src/components/WishlistItemCard';
const persistKey = 'wishlist-items';
const WishlistPage = () => {
    const [category, setCategory] = useState(null);
    const [items, setItems] = useState([]);
    useEffect(() => {
        const persisted = localStorage.getItem(persistKey);
        if (persisted) {
            try {
                setItems(JSON.parse(persisted));
            }
            catch {
                setItems([]);
            }
        }
    }, []);
    return (_jsxs("div", { className: "container mx-auto px-4 py-8", children: [_jsx("h1", { className: "text-3xl font-bold mb-6", children: "Wishlist" }), _jsx(CategoryFilter, { value: category, onChange: setCategory }), _jsx(WishlistList, { items: items, persistKey: persistKey, categoryFilter: category })] }));
};
export default WishlistPage;
