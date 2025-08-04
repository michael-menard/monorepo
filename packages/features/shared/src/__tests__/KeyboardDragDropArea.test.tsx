import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { KeyboardDragDropArea } from '../components/KeyboardDragDropArea';
import type { KeyboardDragState, KeyboardDragActions } from '../hooks/useKeyboardDragAndDrop';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => children,
}));

describe('KeyboardDragDropArea', () => {
  const mockState: KeyboardDragState = {
    isKeyboardDragging: false,
    draggedItemId: null,
    sourceIndex: null,
    targetIndex: null,
    isFocused: false,
  };

  const mockActions: KeyboardDragActions = {
    handleKeyDown: vi.fn(),
    handleFocus: vi.fn(),
    handleBlur: vi.fn(),
    handleMoveUp: vi.fn(),
    handleMoveDown: vi.fn(),
    handleMoveToTop: vi.fn(),
    handleMoveToBottom: vi.fn(),
    handleCancel: vi.fn(),
    handleConfirm: vi.fn(),
    getKeyboardInstructions: vi.fn(() => 'Test instructions'),
  };

  const defaultProps = {
    state: mockState,
    actions: mockActions,
    children: <div data-testid="test-content">Test Content</div>,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render children when not dragging', () => {
    render(<KeyboardDragDropArea {...defaultProps} />);

    expect(screen.getByTestId('test-content')).toBeInTheDocument();
    expect(screen.queryByText('Test instructions')).not.toBeInTheDocument();
  });

  it('should render instructions when dragging', () => {
    const draggingState = {
      ...mockState,
      isKeyboardDragging: true,
      draggedItemId: 'item-1',
      sourceIndex: 0,
      targetIndex: 1,
    };

    render(
      <KeyboardDragDropArea
        {...defaultProps}
        state={draggingState}
        showInstructions={true}
      />
    );

    expect(screen.getByText('Test instructions')).toBeInTheDocument();
  });

  it('should render controls when dragging and showControls is true', () => {
    const draggingState = {
      ...mockState,
      isKeyboardDragging: true,
      draggedItemId: 'item-1',
      sourceIndex: 0,
      targetIndex: 1,
    };

    render(
      <KeyboardDragDropArea
        {...defaultProps}
        state={draggingState}
        showControls={true}
      />
    );

    expect(screen.getByLabelText('Move item to top')).toBeInTheDocument();
    expect(screen.getByLabelText('Move item up')).toBeInTheDocument();
    expect(screen.getByLabelText('Move item down')).toBeInTheDocument();
    expect(screen.getByLabelText('Move item to bottom')).toBeInTheDocument();
    expect(screen.getByLabelText('Confirm move item')).toBeInTheDocument();
    expect(screen.getByLabelText('Cancel move item')).toBeInTheDocument();
  });

  it('should not render controls when showControls is false', () => {
    const draggingState = {
      ...mockState,
      isKeyboardDragging: true,
      draggedItemId: 'item-1',
      sourceIndex: 0,
      targetIndex: 1,
    };

    render(
      <KeyboardDragDropArea
        {...defaultProps}
        state={draggingState}
        showControls={false}
      />
    );

    expect(screen.queryByLabelText('Move test item to top')).not.toBeInTheDocument();
  });

  it('should call handleMoveToTop when top button is clicked', () => {
    const draggingState = {
      ...mockState,
      isKeyboardDragging: true,
      draggedItemId: 'item-1',
      sourceIndex: 0,
      targetIndex: 1,
    };

    render(
      <KeyboardDragDropArea
        {...defaultProps}
        state={draggingState}
        showControls={true}
      />
    );

    fireEvent.click(screen.getByLabelText('Move item to top'));
    expect(mockActions.handleMoveToTop).toHaveBeenCalled();
  });

  it('should call handleMoveUp when up button is clicked', () => {
    const draggingState = {
      ...mockState,
      isKeyboardDragging: true,
      draggedItemId: 'item-1',
      sourceIndex: 0,
      targetIndex: 1,
    };

    render(
      <KeyboardDragDropArea
        {...defaultProps}
        state={draggingState}
        showControls={true}
      />
    );

    fireEvent.click(screen.getByLabelText('Move item up'));
    expect(mockActions.handleMoveUp).toHaveBeenCalled();
  });

  it('should call handleMoveDown when down button is clicked', () => {
    const draggingState = {
      ...mockState,
      isKeyboardDragging: true,
      draggedItemId: 'item-1',
      sourceIndex: 0,
      targetIndex: 1,
    };

    render(
      <KeyboardDragDropArea
        {...defaultProps}
        state={draggingState}
        showControls={true}
      />
    );

    fireEvent.click(screen.getByLabelText('Move item down'));
    expect(mockActions.handleMoveDown).toHaveBeenCalled();
  });

  it('should call handleMoveToBottom when bottom button is clicked', () => {
    const draggingState = {
      ...mockState,
      isKeyboardDragging: true,
      draggedItemId: 'item-1',
      sourceIndex: 0,
      targetIndex: 1,
    };

    render(
      <KeyboardDragDropArea
        {...defaultProps}
        state={draggingState}
        showControls={true}
      />
    );

    fireEvent.click(screen.getByLabelText('Move item to bottom'));
    expect(mockActions.handleMoveToBottom).toHaveBeenCalled();
  });

  it('should call handleConfirm when confirm button is clicked', () => {
    const draggingState = {
      ...mockState,
      isKeyboardDragging: true,
      draggedItemId: 'item-1',
      sourceIndex: 0,
      targetIndex: 1,
    };

    render(
      <KeyboardDragDropArea
        {...defaultProps}
        state={draggingState}
        showControls={true}
      />
    );

    fireEvent.click(screen.getByLabelText('Confirm move item'));
    expect(mockActions.handleConfirm).toHaveBeenCalled();
  });

  it('should call handleCancel when cancel button is clicked', () => {
    const draggingState = {
      ...mockState,
      isKeyboardDragging: true,
      draggedItemId: 'item-1',
      sourceIndex: 0,
      targetIndex: 1,
    };

    render(
      <KeyboardDragDropArea
        {...defaultProps}
        state={draggingState}
        showControls={true}
      />
    );

    fireEvent.click(screen.getByLabelText('Cancel move item'));
    expect(mockActions.handleCancel).toHaveBeenCalled();
  });

  it('should call handleCancel when cancel button in instructions is clicked', () => {
    const draggingState = {
      ...mockState,
      isKeyboardDragging: true,
      draggedItemId: 'item-1',
      sourceIndex: 0,
      targetIndex: 1,
    };

    render(
      <KeyboardDragDropArea
        {...defaultProps}
        state={draggingState}
        showInstructions={true}
      />
    );

    fireEvent.click(screen.getByLabelText('Cancel move operation'));
    expect(mockActions.handleCancel).toHaveBeenCalled();
  });

  it('should apply correct CSS classes when dragging', () => {
    const draggingState = {
      ...mockState,
      isKeyboardDragging: true,
      draggedItemId: 'item-1',
      sourceIndex: 0,
      targetIndex: 1,
    };

    const { container } = render(
      <KeyboardDragDropArea
        {...defaultProps}
        state={draggingState}
      />
    );

    const mainContent = container.firstChild?.firstChild as HTMLElement;
    expect(mainContent?.className).toContain('ring-2');
    expect(mainContent?.className).toContain('ring-blue-500');
  });

  it('should apply correct CSS classes when moving', () => {
    const movingState = {
      ...mockState,
      isKeyboardDragging: true,
      draggedItemId: 'item-1',
      sourceIndex: 0,
      targetIndex: 2, // Different from source
    };

    const { container } = render(
      <KeyboardDragDropArea
        {...defaultProps}
        state={movingState}
      />
    );

    const mainContent = container.firstChild?.firstChild as HTMLElement;
    expect(mainContent?.className).toContain('bg-blue-50');
  });

  it('should use custom itemType in button labels', () => {
    const draggingState = {
      ...mockState,
      isKeyboardDragging: true,
      draggedItemId: 'item-1',
      sourceIndex: 0,
      targetIndex: 1,
    };

    render(
      <KeyboardDragDropArea
        {...defaultProps}
        state={draggingState}
        showControls={true}
        itemType="custom item"
      />
    );

    expect(screen.getByLabelText('Move custom item to top')).toBeInTheDocument();
    expect(screen.getByLabelText('Move custom item up')).toBeInTheDocument();
    expect(screen.getByLabelText('Move custom item down')).toBeInTheDocument();
    expect(screen.getByLabelText('Move custom item to bottom')).toBeInTheDocument();
    expect(screen.getByLabelText('Confirm move custom item')).toBeInTheDocument();
    expect(screen.getByLabelText('Cancel move custom item')).toBeInTheDocument();
  });
}); 