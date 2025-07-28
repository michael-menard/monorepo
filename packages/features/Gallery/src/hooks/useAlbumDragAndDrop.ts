import React, { useState, useCallback, useRef } from 'react';
import { DragDropData, DragDropDataSchema } from '../schemas/index.js';

interface DragState {
  isDragOver: boolean;
  isDragging: boolean;
  draggedImages: string[];
}

interface UseAlbumDragAndDropReturn {
  state: DragState;
  actions: {
    handleDragStart: (e: React.DragEvent, imageIds: string[]) => void;
    handleDragOver: (e: React.DragEvent) => void;
    handleDragEnter: (e: React.DragEvent) => void;
    handleDragLeave: (e: React.DragEvent) => void;
    handleDrop: (e: React.DragEvent, onImagesDropped: (imageIds: string[]) => void) => void;
    dragAreaProps: {
      onDragOver: (e: React.DragEvent) => void;
      onDragEnter: (e: React.DragEvent) => void;
      onDragLeave: (e: React.DragEvent) => void;
      onDrop: (e: React.DragEvent) => void;
    };
  };
}

export const useAlbumDragAndDrop = (): UseAlbumDragAndDropReturn => {
  const [state, setState] = useState<DragState>({
    isDragOver: false,
    isDragging: false,
    draggedImages: [],
  });

  const dragCounter = useRef(0);

  const handleDragStart = useCallback((e: React.DragEvent, imageIds: string[]) => {
    const dragData: DragDropData = {
      type: 'gallery-image',
      imageIds,
      source: 'gallery',
    };

    e.dataTransfer.setData('application/json', JSON.stringify(dragData));
    e.dataTransfer.effectAllowed = 'copy';

    setState((prev) => ({
      ...prev,
      isDragging: true,
      draggedImages: imageIds,
    }));
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    dragCounter.current++;

    // Check if the drag data contains gallery images
    const hasGalleryImages = e.dataTransfer.types.includes('application/json');

    if (hasGalleryImages) {
      setState((prev) => ({ ...prev, isDragOver: true }));
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    dragCounter.current--;

    if (dragCounter.current === 0) {
      setState((prev) => ({ ...prev, isDragOver: false }));
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, onImagesDropped: (imageIds: string[]) => void) => {
      e.preventDefault();
      e.stopPropagation();

      dragCounter.current = 0;
      setState((prev) => ({
        ...prev,
        isDragOver: false,
        isDragging: false,
        draggedImages: [],
      }));

      try {
        const jsonData = e.dataTransfer.getData('application/json');
        if (jsonData) {
          const parsedData = JSON.parse(jsonData);
          const validatedData = DragDropDataSchema.parse(parsedData);

          if (validatedData.type === 'gallery-image' && validatedData.imageIds.length > 0) {
            onImagesDropped(validatedData.imageIds);
          }
        }
      } catch (error) {
        console.warn('Invalid drag data format:', error);
      }
    },
    [],
  );

  const dragAreaProps = {
    onDragOver: handleDragOver,
    onDragEnter: handleDragEnter,
    onDragLeave: handleDragLeave,
    onDrop: (e: React.DragEvent) => handleDrop(e, () => {}), // This will be overridden
  };

  return {
    state,
    actions: {
      handleDragStart,
      handleDragOver,
      handleDragEnter,
      handleDragLeave,
      handleDrop,
      dragAreaProps,
    },
  };
};
