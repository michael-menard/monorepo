import { useState, useCallback, useRef } from 'react';
export const useDragAndDrop = () => {
    const [state, setState] = useState({
        isDragOver: false,
        isDragging: false
    });
    const dragCounter = useRef(0);
    const handleDragOver = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);
    const handleDragEnter = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter.current++;
        if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
            setState(prev => ({ ...prev, isDragOver: true, isDragging: true }));
        }
    }, []);
    const handleDragLeave = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter.current--;
        if (dragCounter.current === 0) {
            setState(prev => ({ ...prev, isDragOver: false, isDragging: false }));
        }
    }, []);
    const handleDrop = useCallback((e, onFilesDrop) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter.current = 0;
        setState(prev => ({ ...prev, isDragOver: false, isDragging: false }));
        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
            onFilesDrop(files);
        }
    }, []);
    const dragAreaProps = {
        onDragOver: handleDragOver,
        onDragEnter: handleDragEnter,
        onDragLeave: handleDragLeave,
        onDrop: (e) => handleDrop(e, () => { }) // This will be overridden
    };
    return {
        state,
        actions: {
            handleDragOver,
            handleDragEnter,
            handleDragLeave,
            handleDrop,
            dragAreaProps
        }
    };
};
