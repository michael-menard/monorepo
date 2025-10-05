import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronUp, ChevronDown, ArrowUp, ArrowDown, X, Check } from 'lucide-react';
import type { KeyboardDragState, KeyboardDragActions } from '../../hooks/useKeyboardDragAndDrop';

export interface KeyboardDragDropAreaProps {
  children: React.ReactNode;
  state: KeyboardDragState;
  actions: KeyboardDragActions;
  className?: string;
  itemType?: string;
  showInstructions?: boolean;
  showControls?: boolean;
}

export const KeyboardDragDropArea: React.FC<KeyboardDragDropAreaProps> = ({
  children,
  state,
  actions,
  className = '',
  itemType = 'item',
  showInstructions = true,
  showControls = true,
}) => {
  const isDragging = state.isKeyboardDragging;
  const hasTarget = state.targetIndex !== null && state.sourceIndex !== null;
  const isMoving = hasTarget && state.targetIndex !== state.sourceIndex;

  return (
    <div className={`relative ${className}`}>
      {/* Main content area */}
      <div
        className={`
          transition-all duration-200
          ${isDragging ? 'ring-2 ring-blue-500 ring-opacity-50' : ''}
          ${isMoving ? 'bg-blue-50 bg-opacity-30' : ''}
        `}
      >
        {children}
      </div>

      {/* Keyboard instructions */}
      <AnimatePresence>
        {showInstructions && isDragging && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute -top-12 left-0 right-0 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg z-50"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {actions.getKeyboardInstructions()}
              </span>
              <button
                type="button"
                onClick={actions.handleCancel}
                className="ml-2 p-1 hover:bg-blue-700 rounded transition-colors"
                aria-label="Cancel move operation"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Keyboard controls */}
      <AnimatePresence>
        {showControls && isDragging && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute -right-4 top-1/2 transform -translate-y-1/2 bg-white border border-gray-200 rounded-lg shadow-lg p-2 z-40"
          >
            <div className="flex flex-col gap-1">
              <button
                type="button"
                onClick={actions.handleMoveToTop}
                className="p-2 hover:bg-gray-100 rounded transition-colors"
                aria-label={`Move ${itemType} to top`}
                title={`Move ${itemType} to top`}
              >
                <ArrowUp className="w-4 h-4" />
              </button>
              
              <button
                type="button"
                onClick={actions.handleMoveUp}
                className="p-2 hover:bg-gray-100 rounded transition-colors"
                aria-label={`Move ${itemType} up`}
                title={`Move ${itemType} up`}
              >
                <ChevronUp className="w-4 h-4" />
              </button>
              
              <button
                type="button"
                onClick={actions.handleMoveDown}
                className="p-2 hover:bg-gray-100 rounded transition-colors"
                aria-label={`Move ${itemType} down`}
                title={`Move ${itemType} down`}
              >
                <ChevronDown className="w-4 h-4" />
              </button>
              
              <button
                type="button"
                onClick={actions.handleMoveToBottom}
                className="p-2 hover:bg-gray-100 rounded transition-colors"
                aria-label={`Move ${itemType} to bottom`}
                title={`Move ${itemType} to bottom`}
              >
                <ArrowDown className="w-4 h-4" />
              </button>
              
              <div className="border-t border-gray-200 my-1" />
              
              <button
                type="button"
                onClick={actions.handleConfirm}
                className="p-2 hover:bg-green-100 rounded transition-colors"
                aria-label={`Confirm move ${itemType}`}
                title={`Confirm move ${itemType}`}
              >
                <Check className="w-4 h-4 text-green-600" />
              </button>
              
              <button
                type="button"
                onClick={actions.handleCancel}
                className="p-2 hover:bg-red-100 rounded transition-colors"
                aria-label={`Cancel move ${itemType}`}
                title={`Cancel move ${itemType}`}
              >
                <X className="w-4 h-4 text-red-600" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Position indicator */}
      <AnimatePresence>
        {isDragging && hasTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute -left-2 top-0 bottom-0 w-1 bg-blue-500 rounded-full z-30"
            style={{
              transform: `translateY(${(state.targetIndex! / (state.totalItems || 1)) * 100}%)`,
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default KeyboardDragDropArea; 