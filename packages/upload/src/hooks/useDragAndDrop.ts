import { useState, useCallback, useRef } from 'react';

export interface UseDragAndDropOptions {
  onFilesDropped?: (files: File[]) => void;
  accept?: string[];
  multiple?: boolean;
  disabled?: boolean;
}

export interface UseDragAndDropReturn {
  isDragActive: boolean;
  isDragAccept: boolean;
  isDragReject: boolean;
  getRootProps: () => {
    onDragEnter: (event: React.DragEvent) => void;
    onDragLeave: (event: React.DragEvent) => void;
    onDragOver: (event: React.DragEvent) => void;
    onDrop: (event: React.DragEvent) => void;
  };
  getInputProps: () => {
    type: 'file';
    multiple: boolean;
    accept?: string;
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
    style: { display: 'none' };
  };
  open: () => void;
}

export const useDragAndDrop = (options: UseDragAndDropOptions = {}): UseDragAndDropReturn => {
  const [isDragActive, setIsDragActive] = useState(false);
  const [isDragAccept, setIsDragAccept] = useState(false);
  const [isDragReject, setIsDragReject] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);

  const { onFilesDropped, accept, multiple = true, disabled = false } = options;

  const checkAcceptedFiles = useCallback((files: File[]) => {
    if (!accept || accept.length === 0) return true;
    
    return files.every(file => 
      accept.some(acceptType => {
        if (acceptType === '*/*') return true;
        if (acceptType.endsWith('/*')) {
          return file.type.startsWith(acceptType.slice(0, -1));
        }
        return file.type === acceptType;
      })
    );
  }, [accept]);

  const handleDragEnter = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    
    if (disabled) return;

    dragCounter.current++;
    
    if (event.dataTransfer?.items) {
      const files = Array.from(event.dataTransfer.items)
        .filter(item => item.kind === 'file')
        .map(item => item.getAsFile())
        .filter(Boolean) as File[];
      
      const isAccepted = checkAcceptedFiles(files);
      setIsDragAccept(isAccepted);
      setIsDragReject(!isAccepted);
    }
    
    setIsDragActive(true);
  }, [disabled, checkAcceptedFiles]);

  const handleDragLeave = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    
    if (disabled) return;

    dragCounter.current--;
    
    if (dragCounter.current === 0) {
      setIsDragActive(false);
      setIsDragAccept(false);
      setIsDragReject(false);
    }
  }, [disabled]);

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    
    if (disabled) return;

    event.dataTransfer.dropEffect = 'copy';
  }, [disabled]);

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    
    if (disabled) return;

    dragCounter.current = 0;
    setIsDragActive(false);
    setIsDragAccept(false);
    setIsDragReject(false);

    const files = Array.from(event.dataTransfer.files);
    
    if (files.length > 0) {
      const filesToProcess = multiple ? files : files.slice(0, 1);
      onFilesDropped?.(filesToProcess);
    }
  }, [disabled, multiple, onFilesDropped]);

  const handleInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length > 0) {
      onFilesDropped?.(files);
    }
    // Reset input value to allow selecting the same file again
    event.target.value = '';
  }, [onFilesDropped]);

  const open = useCallback(() => {
    if (inputRef.current && !disabled) {
      inputRef.current.click();
    }
  }, [disabled]);

  const getRootProps = useCallback(() => ({
    onDragEnter: handleDragEnter,
    onDragLeave: handleDragLeave,
    onDragOver: handleDragOver,
    onDrop: handleDrop,
  }), [handleDragEnter, handleDragLeave, handleDragOver, handleDrop]);

  const getInputProps = useCallback(() => ({
    ref: inputRef,
    type: 'file' as const,
    multiple,
    accept: accept?.join(','),
    onChange: handleInputChange,
    style: { display: 'none' as const },
  }), [multiple, accept, handleInputChange]);

  return {
    isDragActive,
    isDragAccept,
    isDragReject,
    getRootProps,
    getInputProps,
    open,
  };
};
