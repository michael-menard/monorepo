import { useState, useCallback, useRef } from 'react';

export interface DragAndDropState {
  isDragOver: boolean;
  isDragging: boolean;
}

export interface DragAndDropActions {
  handleDragOver: (e: React.DragEvent) => void;
  handleDragEnter: (e: React.DragEvent) => void;
  handleDragLeave: (e: React.DragEvent) => void;
  handleDrop: (e: React.DragEvent, onFilesDrop: (files: File[]) => void) => void;
  dragAreaProps: {
    onDragOver: (e: React.DragEvent) => void;
    onDragEnter: (e: React.DragEvent) => void;
    onDragLeave: (e: React.DragEvent) => void;
    onDrop: (e: React.DragEvent) => void;
  };
}

export const useDragAndDrop = () => {
  const [state, setState] = useState<DragAndDropState>({
    isDragOver: false,
    isDragging: false
  });

  const dragCounter = useRef(0);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    dragCounter.current++;
    
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setState(prev => ({ ...prev, isDragOver: true, isDragging: true }));
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    dragCounter.current--;
    
    if (dragCounter.current === 0) {
      setState(prev => ({ ...prev, isDragOver: false, isDragging: false }));
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, onFilesDrop: (files: File[]) => void) => {
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
    onDrop: (e: React.DragEvent) => handleDrop(e, () => {}) // This will be overridden
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