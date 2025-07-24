import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useCallback, useEffect, useState, useRef } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import WishlistItemCard from './WishlistItemCard';
import { motion } from 'framer-motion';
// Add import for RTK Query mutation
// @ts-ignore: This import is from the main app, adjust path as needed in integration
import { useUpdateWishlistMutation } from 'apps/web/lego-projects-ui/src/store/wishlistApi';
export const reorder = (list, startIndex, endIndex) => {
    const result = Array.from(list);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);
    return result.map((item, idx) => ({ ...item, sortOrder: idx }));
};
export const WishlistList = ({ items, onEdit, onDelete, onReorder, persistKey = 'wishlist-items', categoryFilter = null, }) => {
    // Ensure no undefined items are used
    const safeItems = Array.isArray(items) ? items.filter((i) => !!i) : [];
    const [orderedItems, setOrderedItems] = useState(safeItems);
    const [updateWishlist, { isLoading: isSaving, isError, isSuccess, error }] = useUpdateWishlistMutation();
    const saveTimeout = useRef(null);
    const lastSaved = useRef(JSON.stringify(orderedItems));
    // Load from localStorage on mount
    useEffect(() => {
        const persisted = localStorage.getItem(persistKey);
        if (persisted) {
            try {
                const parsed = JSON.parse(persisted);
                // Only use persisted if IDs match
                if (parsed.length === safeItems.length &&
                    parsed.every(p => !!safeItems.find(i => i.id === p.id))) {
                    setOrderedItems(parsed);
                    return;
                }
            }
            catch { }
        }
        setOrderedItems(safeItems);
    }, [items, persistKey]);
    // Persist to localStorage on change
    useEffect(() => {
        localStorage.setItem(persistKey, JSON.stringify(orderedItems));
    }, [orderedItems, persistKey]);
    // Debounced auto-save effect
    useEffect(() => {
        if (JSON.stringify(orderedItems) === lastSaved.current)
            return;
        if (saveTimeout.current)
            clearTimeout(saveTimeout.current);
        saveTimeout.current = setTimeout(() => {
            updateWishlist({ items: orderedItems })
                .unwrap()
                .then(() => {
                localStorage.setItem(persistKey, JSON.stringify(orderedItems));
                lastSaved.current = JSON.stringify(orderedItems);
            })
                .catch(() => {
                // Optionally handle error (e.g., show toast)
            });
        }, 2000);
        return () => {
            if (saveTimeout.current)
                clearTimeout(saveTimeout.current);
        };
    }, [orderedItems, updateWishlist, persistKey]);
    // Save on page unload
    useEffect(() => {
        const handleUnload = () => {
            if (JSON.stringify(orderedItems) !== lastSaved.current) {
                updateWishlist({ items: orderedItems });
                localStorage.setItem(persistKey, JSON.stringify(orderedItems));
                lastSaved.current = JSON.stringify(orderedItems);
            }
        };
        window.addEventListener('beforeunload', handleUnload);
        return () => {
            window.removeEventListener('beforeunload', handleUnload);
        };
    }, [orderedItems, updateWishlist, persistKey]);
    const handleDragEnd = useCallback((result) => {
        if (!result.destination)
            return;
        if (result.destination.index === result.source.index)
            return;
        const newOrder = reorder(orderedItems, result.source.index, result.destination.index);
        setOrderedItems(newOrder);
        onReorder?.(newOrder);
    }, [orderedItems, onReorder]);
    // Filter items by category if filter is set
    const filteredItems = categoryFilter
        ? orderedItems.filter(item => item.category === categoryFilter)
        : orderedItems;
    return (_jsx(DragDropContext, { onDragEnd: handleDragEnd, children: _jsx(Droppable, { droppableId: "wishlist-list", children: (provided) => (_jsxs("div", { ref: provided.innerRef, ...provided.droppableProps, className: "flex flex-col gap-4", children: [filteredItems.map((item, idx) => (_jsx(Draggable, { draggableId: item.id, index: idx, children: (dragProvided, snapshot) => (_jsx("div", { ref: dragProvided.innerRef, ...dragProvided.draggableProps, ...dragProvided.dragHandleProps, style: {
                                ...dragProvided.draggableProps.style,
                                marginBottom: '0.5rem',
                            }, children: _jsx(motion.div, { layout: true, transition: { type: 'spring', stiffness: 500, damping: 30 }, animate: {
                                    scale: snapshot.isDragging ? 1.03 : 1,
                                    boxShadow: snapshot.isDragging
                                        ? '0 8px 24px rgba(0,0,0,0.18)'
                                        : '0 1px 4px rgba(0,0,0,0.08)',
                                    zIndex: snapshot.isDragging ? 10 : 1,
                                    opacity: snapshot.isDragging ? 0.7 : 1,
                                }, children: _jsx(WishlistItemCard, { item: item, onEdit: onEdit ?? (() => { }), onDelete: onDelete ?? (() => { }) }) }) })) }, item.id))), provided.placeholder] })) }) }));
};
// Helper for use with CategoryFilter
export const filterWishlistByCategory = (items, category) => category ? items.filter(item => item.category === category) : items;
export default WishlistList;
