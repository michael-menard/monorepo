import { Request, Response } from 'express';
import { 
  getWishlist, 
  createWishlistItem, 
  updateWishlistItem, 
  searchWishlist 
} from '../handlers/wishlist';
import { db } from '../db/client';
import { wishlistItems } from '../db/schema';
import { eq, and } from 'drizzle-orm';

// Mock database operations
jest.mock('../db/client');
const mockDb = db as jest.Mocked<typeof db>;

// Mock Elasticsearch functions
jest.mock('../utils/elasticsearch', () => ({
  indexWishlistItem: jest.fn().mockResolvedValue(undefined),
  updateWishlistItem: jest.fn().mockResolvedValue(undefined),
  deleteWishlistItem: jest.fn().mockResolvedValue(undefined),
  searchWishlistItems: jest.fn(),
  initializeWishlistIndex: jest.fn().mockResolvedValue(undefined),
}));

import { 
  indexWishlistItem, 
  updateWishlistItem as updateWishlistItemES, 
  searchWishlistItems as searchWishlistItemsES 
} from '../utils/elasticsearch';

describe('Wishlist Category and Search Functionality', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn(() => ({ json: jsonMock }));
    
    mockReq = {
      authenticatedUserId: 'test-user-id',
      query: {},
      body: {}
    };
    
    mockRes = {
      status: statusMock,
      json: jsonMock
    };

    jest.clearAllMocks();
  });

  describe('Category Support in getWishlist', () => {
    it('should retrieve all wishlist items when no category filter is provided', async () => {
      const mockWishlistItems = [
        {
          id: '1',
          userId: 'test-user-id',
          title: 'LEGO Speed Champions Ferrari',
          description: 'Fast car set',
          category: 'Speed Champions',
          sortOrder: '1',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: '2',
          userId: 'test-user-id',
          title: 'LEGO Creator Big Ben',
          description: 'Architecture set',
          category: 'Creator Expert',
          sortOrder: '2',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      // Mock database query without category filter
      const mockOrderBy = jest.fn().mockResolvedValue(mockWishlistItems);
      const mockWhere = jest.fn().mockReturnValue({ orderBy: mockOrderBy });
      const mockFrom = jest.fn().mockReturnValue({ where: mockWhere });
      (mockDb.select as jest.Mock).mockReturnValue({ from: mockFrom });

      await getWishlist(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        status: 200,
        message: 'Wishlist retrieved successfully',
        data: { items: mockWishlistItems }
      });
    });

    it('should filter wishlist items by category when category parameter is provided', async () => {
      const mockWishlistItems = [
        {
          id: '1',
          userId: 'test-user-id',
          title: 'LEGO Speed Champions Ferrari',
          description: 'Fast car set',
          category: 'Speed Champions',
          sortOrder: '1',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      mockReq.query = { category: 'Speed Champions' };

      // Mock database query with category filter
      const mockOrderBy = jest.fn().mockResolvedValue(mockWishlistItems);
      const mockWhere = jest.fn().mockReturnValue({ orderBy: mockOrderBy });
      const mockFrom = jest.fn().mockReturnValue({ where: mockWhere });
      (mockDb.select as jest.Mock).mockReturnValue({ from: mockFrom });

      await getWishlist(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        status: 200,
        message: 'Wishlist retrieved successfully',
        data: { items: mockWishlistItems }
      });
    });
  });

  describe('Category Support in createWishlistItem', () => {
    it('should create wishlist item with category and index in Elasticsearch', async () => {
      const newItemData = {
        title: 'LEGO Modular Corner Garage',
        description: 'Beautiful modular building',
        category: 'Modular',
        sortOrder: '1'
      };

      const mockCreatedItem = {
        id: 'new-item-id',
        userId: 'test-user-id',
        ...newItemData,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockReq.body = newItemData;

      // Mock database insert
      const mockReturning = jest.fn().mockResolvedValue([mockCreatedItem]);
      const mockValues = jest.fn().mockReturnValue({ returning: mockReturning });
      (mockDb.insert as jest.Mock).mockReturnValue({ values: mockValues });

      await createWishlistItem(mockReq as Request, mockRes as Response);

      expect(indexWishlistItem).toHaveBeenCalledWith(mockCreatedItem);
      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith({
        status: 201,
        message: 'Wishlist item created successfully',
        data: { item: mockCreatedItem }
      });
    });

    it('should create wishlist item without category when not provided', async () => {
      const newItemData = {
        title: 'LEGO Basic Set',
        description: 'Simple set',
        sortOrder: '1'
      };

      const mockCreatedItem = {
        id: 'new-item-id',
        userId: 'test-user-id',
        ...newItemData,
        category: undefined,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockReq.body = newItemData;

      // Mock database insert
      const mockReturning = jest.fn().mockResolvedValue([mockCreatedItem]);
      const mockValues = jest.fn().mockReturnValue({ returning: mockReturning });
      (mockDb.insert as jest.Mock).mockReturnValue({ values: mockValues });

      await createWishlistItem(mockReq as Request, mockRes as Response);

      expect(indexWishlistItem).toHaveBeenCalledWith(mockCreatedItem);
      expect(statusMock).toHaveBeenCalledWith(201);
    });
  });

  describe('Category Support in updateWishlistItem', () => {
    it('should update category and sync with Elasticsearch', async () => {
      const updateData = {
        title: 'Updated LEGO Set',
        category: 'Star Wars'
      };

      const existingItem = {
        id: '1',
        userId: 'test-user-id',
        title: 'Original Set',
        category: 'Modular',
        imageUrl: null
      };

      const updatedItem = {
        ...existingItem,
        ...updateData,
        updatedAt: new Date()
      };

      mockReq.params = { id: '1' };
      mockReq.body = updateData;

      // Mock database operations
      const mockLimit = jest.fn().mockResolvedValue([existingItem]);
      const mockSelectWhere = jest.fn().mockReturnValue({ limit: mockLimit });
      const mockSelectFrom = jest.fn().mockReturnValue({ where: mockSelectWhere });
      (mockDb.select as jest.Mock).mockReturnValue({ from: mockSelectFrom });

      const mockReturning = jest.fn().mockResolvedValue([updatedItem]);
      const mockUpdateWhere = jest.fn().mockReturnValue({ returning: mockReturning });
      const mockSet = jest.fn().mockReturnValue({ where: mockUpdateWhere });
      (mockDb.update as jest.Mock).mockReturnValue({ set: mockSet });

      await updateWishlistItem(mockReq as Request, mockRes as Response);

      expect(updateWishlistItemES).toHaveBeenCalledWith(updatedItem);
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        status: 200,
        message: 'Wishlist item updated successfully',
        data: { item: updatedItem }
      });
    });
  });

  describe('Elasticsearch Search Functionality', () => {
    it('should return Elasticsearch results when ES is available', async () => {
      const mockEsResults = {
        hits: [
          {
            id: '1',
            title: 'LEGO Speed Champions Ferrari',
            description: 'Fast car set',
            category: 'Speed Champions',
            sortOrder: '1'
          }
        ],
        total: 1
      };

      (searchWishlistItemsES as jest.Mock).mockResolvedValue(mockEsResults);

      mockReq.query = {
        q: 'ferrari',
        category: 'Speed Champions',
        from: '0',
        size: '20'
      };

      await searchWishlist(mockReq as Request, mockRes as Response);

      expect(searchWishlistItemsES).toHaveBeenCalledWith({
        userId: 'test-user-id',
        query: 'ferrari',
        category: 'Speed Champions',
        from: 0,
        size: 20
      });

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        status: 200,
        message: 'Wishlist search completed successfully',
        data: {
          items: mockEsResults.hits,
          total: mockEsResults.total,
          source: 'elasticsearch'
        }
      });
    });

    it('should fall back to database search when Elasticsearch is unavailable', async () => {
      (searchWishlistItemsES as jest.Mock).mockResolvedValue(null);

      const mockDbResults = [
        {
          id: '1',
          userId: 'test-user-id',
          title: 'LEGO Speed Champions Ferrari',
          description: 'Fast car set',
          category: 'Speed Champions',
          sortOrder: '1'
        }
      ];

      mockReq.query = {
        q: 'ferrari',
        category: 'Speed Champions',
        from: '0',
        size: '20'
      };

      // Mock database fallback
      const mockOffset = jest.fn().mockResolvedValue(mockDbResults);
      const mockLimit = jest.fn().mockReturnValue({ offset: mockOffset });
      const mockOrderBy = jest.fn().mockReturnValue({ limit: mockLimit });
      const mockWhere = jest.fn().mockReturnValue({ orderBy: mockOrderBy });
      const mockFrom = jest.fn().mockReturnValue({ where: mockWhere });
      (mockDb.select as jest.Mock).mockReturnValue({ from: mockFrom });

      await searchWishlist(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        status: 200,
        message: 'Wishlist search completed successfully',
        data: {
          items: mockDbResults,
          total: mockDbResults.length,
          source: 'database'
        }
      });
    });

    it('should handle search with category filter only', async () => {
      const mockEsResults = {
        hits: [
          {
            id: '1',
            title: 'LEGO Modular Corner Garage',
            category: 'Modular'
          },
          {
            id: '2',
            title: 'LEGO Modular Assembly Square',
            category: 'Modular'
          }
        ],
        total: 2
      };

      (searchWishlistItemsES as jest.Mock).mockResolvedValue(mockEsResults);

      mockReq.query = {
        category: 'Modular'
      };

      await searchWishlist(mockReq as Request, mockRes as Response);

      expect(searchWishlistItemsES).toHaveBeenCalledWith({
        userId: 'test-user-id',
        query: undefined,
        category: 'Modular',
        from: 0,
        size: 20
      });

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        status: 200,
        message: 'Wishlist search completed successfully',
        data: {
          items: mockEsResults.hits,
          total: mockEsResults.total,
          source: 'elasticsearch'
        }
      });
    });

    it('should handle empty search results', async () => {
      const mockEsResults = {
        hits: [],
        total: 0
      };

      (searchWishlistItemsES as jest.Mock).mockResolvedValue(mockEsResults);

      mockReq.query = {
        q: 'nonexistent'
      };

      await searchWishlist(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        status: 200,
        message: 'Wishlist search completed successfully',
        data: {
          items: [],
          total: 0,
          source: 'elasticsearch'
        }
      });
    });

    it('should handle authentication error', async () => {
      mockReq.authenticatedUserId = undefined;

      await searchWishlist(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({
        status: 403,
        error: 'UNAUTHORIZED',
        message: 'User not authenticated'
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully in getWishlist', async () => {
      const mockFrom = jest.fn().mockReturnValue({ 
        where: jest.fn().mockReturnValue({ 
          orderBy: jest.fn().mockRejectedValue(new Error('Database error')) 
        }) 
      });
      (mockDb.select as jest.Mock).mockReturnValue({ from: mockFrom });

      await getWishlist(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        status: 500,
        error: 'INTERNAL_ERROR',
        message: 'Failed to fetch wishlist'
      });
    });

    it('should handle search errors gracefully', async () => {
      (searchWishlistItemsES as jest.Mock).mockRejectedValue(new Error('Search error'));

      await searchWishlist(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        status: 500,
        error: 'INTERNAL_ERROR',
        message: 'Failed to search wishlist'
      });
    });
  });
}); 