import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import AddEditWishlistModal from '../index';
import { wishlistApi } from '../../../store/wishlistApi';
import type { WishlistItem } from '../../../schemas';

// Mock the FileUpload component
vi.mock('../../../../FileUpload', () => ({
  FileUpload: ({ onUpload, onError, disabled, uploadButtonLabel }: any) => (
    <div data-testid="file-upload">
      <button
        onClick={() => {
          if (!disabled) {
            const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
            onUpload([file]);
          }
        }}
        disabled={disabled}
      >
        {uploadButtonLabel}
      </button>
    </div>
  ),
}));

// Mock Redux store
const createMockStore = () => {
  return configureStore({
    reducer: {
      [wishlistApi.reducerPath]: wishlistApi.reducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(wishlistApi.middleware),
  });
};

// Mock RTK Query hooks
const mockCreateMutation = vi.fn();
const mockUpdateMutation = vi.fn();

vi.mock('../../../store/wishlistApi', async () => {
  const actual = await vi.importActual('../../../store/wishlistApi');
  return {
    ...actual,
    useCreateWishlistItemMutation: () => [
      mockCreateMutation,
      { isLoading: false, error: null },
    ],
    useUpdateWishlistItemMutation: () => [
      mockUpdateMutation,
      { isLoading: false, error: null },
    ],
  };
});

const mockItem: WishlistItem = {
  id: '1',
  name: 'Test Item',
  description: 'Test Description',
  price: 99.99,
  url: 'https://example.com/product',
  imageUrl: 'https://example.com/image.jpg',
  priority: 'high',
  category: 'electronics',
  isPurchased: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  wishlistId: 'wishlist-1',
  onSuccess: vi.fn(),
};

const renderWithProvider = (props = {}) => {
  const store = createMockStore();
  return render(
    <Provider store={store}>
      <AddEditWishlistModal {...defaultProps} {...props} />
    </Provider>
  );
};

describe('AddEditWishlistModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Add Mode', () => {
    it('renders add modal with correct title', () => {
      renderWithProvider();
      expect(screen.getByText('Add Wishlist Item')).toBeInTheDocument();
    });

    it('renders form fields', () => {
      renderWithProvider();
      
      expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/price/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/product link/i)).toBeInTheDocument();
      expect(screen.getByText(/priority/i)).toBeInTheDocument();
      expect(screen.getAllByText(/category/i)).toHaveLength(2); // Label and placeholder
      expect(screen.getAllByText(/image/i)).toHaveLength(2); // Label and file type info
    });


  });

  describe('Edit Mode', () => {
    it('renders edit modal with correct title', () => {
      renderWithProvider({ item: mockItem });
      expect(screen.getByText('Edit Wishlist Item')).toBeInTheDocument();
    });

    it('pre-fills form with existing data', () => {
      renderWithProvider({ item: mockItem });

      expect(screen.getByDisplayValue('Test Item')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Test Description')).toBeInTheDocument();
      expect(screen.getByDisplayValue('99.99')).toBeInTheDocument();
      expect(screen.getByDisplayValue('https://example.com/product')).toBeInTheDocument();
    });
  });

  describe('Modal Interactions', () => {
    it('renders cancel and submit buttons', () => {
      renderWithProvider();
      
      expect(screen.getByText('Cancel')).toBeInTheDocument();
      expect(screen.getByText('Add Item')).toBeInTheDocument();
    });

    it('renders update button in edit mode', () => {
      renderWithProvider({ item: mockItem });
      expect(screen.getByText('Update Item')).toBeInTheDocument();
    });
  });
}); 