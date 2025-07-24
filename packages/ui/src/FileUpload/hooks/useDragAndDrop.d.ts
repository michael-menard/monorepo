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
export declare const useDragAndDrop: () => {
    state: DragAndDropState;
    actions: {
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
    };
};
