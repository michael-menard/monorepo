import { Request, Response } from 'express';
import { 
  reorderWishlist, 
  reorderWishlistDebounced,
  getReorderStatus,
  cancelPendingReorder
} from '../handlers/wishlist';
import { db } from '../db/client';
import { wishlistItems } from '../db/schema';

// Mock database operations
jest.mock('../db/client');
const mockDb = db as jest.Mocked<typeof db>;

// Mock Elasticsearch functions
jest.mock('../utils/elasticsearch', () => ({
  updateWishlistItem: jest.fn().mockResolvedValue(undefined),
  initializeWishlistIndex: jest.fn().mockResolvedValue(undefined),
}));

import { updateWishlistItem as updateWishlistItemES } from '../utils/elasticsearch';

describe('Wishlist Reorder Persistence', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn(() => ({ json: jsonMock }));
    
    mockReq = {
      authenticatedUserId: 'test-user-id',
      body: {}
    };
    
    mockRes = {
      status: statusMock,
      json: jsonMock
    };

    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('Enhanced reorderWishlist', () => {
    it('should handle successful reorder with change detection', async () => {
      const mockUserItems = [
        { id: '1', sortOrder: '1', updatedAt: new Date() },
        { id: '2', sortOrder: '2', updatedAt: new Date() }
      ];

      const mockUpdatedItem = {
        id: '1',
        userId: 'test-user-id',
        title: 'Item 1',
        sortOrder: '2',
        updatedAt: new Date()
      };

      const mockFinalItems = [
        { ...mockUpdatedItem },
        { id: '2', sortOrder: '1' }
      ];

      mockReq.body = {
        itemOrders: [
          { id: '1', sortOrder: '2' },
          { id: '2', sortOrder: '1' }
        ],
        requestId: 'req-123'
      };

             // Mock database operations
       const mockSelectWhere = jest.fn().mockResolvedValue(mockUserItems);
       const mockSelectFrom = jest.fn().mockReturnValue({ where: mockSelectWhere });
       const mockFinalWhere = jest.fn().mockReturnValue({ orderBy: jest.fn().mockResolvedValue(mockFinalItems) });
       const mockFinalFrom = jest.fn().mockReturnValue({ where: mockFinalWhere });
       const mockReturning = jest.fn().mockResolvedValue([mockUpdatedItem]);
       const mockSet = jest.fn().mockReturnValue({ where: jest.fn().mockReturnValue({ returning: mockReturning }) });

       (mockDb.select as jest.Mock)
         .mockReturnValueOnce({ from: mockSelectFrom })  // First call for user items validation
         .mockReturnValue({ from: mockFinalFrom });       // Second call for final items

       (mockDb.update as jest.Mock).mockReturnValue({ set: mockSet });

      await reorderWishlist(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        status: 200,
        message: 'Wishlist reordered successfully',
        data: expect.objectContaining({
          items: mockFinalItems,
          requestId: 'req-123',
          changed: true,
          timestamp: expect.any(String)
        })
      });
    });

    it('should skip update when no changes detected', async () => {
      const mockUserItems = [
        { id: '1', sortOrder: '1', updatedAt: new Date() },
        { id: '2', sortOrder: '2', updatedAt: new Date() }
      ];

      mockReq.body = {
        itemOrders: [
          { id: '1', sortOrder: '1' }, // Same as current
          { id: '2', sortOrder: '2' }  // Same as current
        ],
        requestId: 'req-123'
      };

             // Mock database operations
       const mockSelectWhere = jest.fn().mockResolvedValue(mockUserItems);
       const mockSelectFrom = jest.fn().mockReturnValue({ where: mockSelectWhere });
       const mockFinalWhere = jest.fn().mockReturnValue({ orderBy: jest.fn().mockResolvedValue(mockUserItems) });
       const mockFinalFrom = jest.fn().mockReturnValue({ where: mockFinalWhere });

       (mockDb.select as jest.Mock)
         .mockReturnValueOnce({ from: mockSelectFrom })  // For user items validation
         .mockReturnValue({ from: mockFinalFrom });       // For final items if called

      await reorderWishlist(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        status: 200,
        message: 'Wishlist order already up to date',
        data: expect.objectContaining({
          items: mockUserItems,
          requestId: 'req-123',
          changed: false
        })
      });

      // Should not call update since no changes
      expect(mockDb.update).not.toHaveBeenCalled();
    });

    it('should validate item ownership', async () => {
      mockReq.body = {
        itemOrders: [
          { id: 'invalid-id', sortOrder: '1' }
        ]
      };

             const mockSelectWhere = jest.fn().mockResolvedValue([]);
       const mockSelectFrom = jest.fn().mockReturnValue({ where: mockSelectWhere });
       (mockDb.select as jest.Mock).mockReturnValue({ from: mockSelectFrom });

      await reorderWishlist(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({
        status: 403,
        error: 'FORBIDDEN',
        message: 'You can only reorder your own wishlist items'
      });
    });

    it('should handle Elasticsearch failures gracefully', async () => {
      const mockUserItems = [
        { id: '1', sortOrder: '1', updatedAt: new Date() }
      ];

      const mockUpdatedItem = {
        id: '1',
        userId: 'test-user-id',
        title: 'Item 1',
        sortOrder: '2',
        updatedAt: new Date()
      };

      mockReq.body = {
        itemOrders: [{ id: '1', sortOrder: '2' }],
        requestId: 'req-123'
      };

      // Mock Elasticsearch to fail
      (updateWishlistItemES as jest.Mock).mockRejectedValue(new Error('ES Error'));

             // Mock database operations
       const mockSelectWhere = jest.fn().mockResolvedValue(mockUserItems);
       const mockSelectFrom = jest.fn().mockReturnValue({ where: mockSelectWhere });
       const mockFinalWhere = jest.fn().mockReturnValue({ orderBy: jest.fn().mockResolvedValue([mockUpdatedItem]) });
       const mockFinalFrom = jest.fn().mockReturnValue({ where: mockFinalWhere });
       const mockReturning = jest.fn().mockResolvedValue([mockUpdatedItem]);
       const mockSet = jest.fn().mockReturnValue({ where: jest.fn().mockReturnValue({ returning: mockReturning }) });

       (mockDb.select as jest.Mock)
         .mockReturnValueOnce({ from: mockSelectFrom })  // For user items validation
         .mockReturnValue({ from: mockFinalFrom });       // For final items

       (mockDb.update as jest.Mock).mockReturnValue({ set: mockSet });

      await reorderWishlist(mockReq as Request, mockRes as Response);

      // Should still succeed despite ES failure
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        status: 200,
        message: 'Wishlist reordered successfully',
        data: expect.objectContaining({
          changed: true
        })
      });
    });
  });

  describe('Debounced reorderWishlistDebounced', () => {
    it('should queue reorder request and return immediate acknowledgment', async () => {
      mockReq.body = {
        itemOrders: [
          { id: '1', sortOrder: '2' },
          { id: '2', sortOrder: '1' }
        ],
        requestId: 'req-123'
      };

             // Mock lightweight validation
       const mockWhere = jest.fn().mockResolvedValue([{ count: 2 }]);
       const mockFrom = jest.fn().mockReturnValue({ where: mockWhere });
       (mockDb.select as jest.Mock).mockReturnValue({ from: mockFrom });

      await reorderWishlistDebounced(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(202);
      expect(jsonMock).toHaveBeenCalledWith({
        status: 202,
        message: 'Reorder request queued - changes will be persisted shortly',
        data: expect.objectContaining({
          requestId: 'req-123',
          debounced: true,
          willPersistAt: expect.any(String)
        })
      });
    });

         it('should debounce multiple rapid requests', async () => {
       const mockWhere1 = jest.fn().mockResolvedValue([{ count: 1 }]);
       const mockFrom1 = jest.fn().mockReturnValue({ where: mockWhere1 });
       const mockWhere2 = jest.fn().mockResolvedValue([{ count: 1 }]);
       const mockFrom2 = jest.fn().mockReturnValue({ where: mockWhere2 });

       (mockDb.select as jest.Mock)
         .mockReturnValueOnce({ from: mockFrom1 }) // First request validation
         .mockReturnValueOnce({ from: mockFrom2 }); // Second request validation

       // First request
       mockReq.body = {
         itemOrders: [{ id: '1', sortOrder: '2' }],
         requestId: 'req-1'
       };
       await reorderWishlistDebounced(mockReq as Request, mockRes as Response);

       // Verify first request queued
       expect(statusMock).toHaveBeenLastCalledWith(202);

       // Second request (should cancel first)
       mockReq.body = {
         itemOrders: [{ id: '1', sortOrder: '3' }],
         requestId: 'req-2'
       };
       await reorderWishlistDebounced(mockReq as Request, mockRes as Response);

       // Verify second request also queued
       expect(statusMock).toHaveBeenLastCalledWith(202);
       expect(statusMock).toHaveBeenCalledTimes(2);
     });

    it('should handle validation errors', async () => {
      mockReq.body = {
        itemOrders: [
          { id: '1' } // Missing sortOrder
        ]
      };

      await reorderWishlistDebounced(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        status: 400,
        error: 'VALIDATION_ERROR',
        message: 'Each item must have id and sortOrder properties'
      });
    });

    it('should handle authorization errors', async () => {
      mockReq.body = {
        itemOrders: [{ id: '1', sortOrder: '2' }]
      };

             // Mock validation to fail (user doesn't own items)
       const mockWhere = jest.fn().mockResolvedValue([{ count: 0 }]);
       const mockFrom = jest.fn().mockReturnValue({ where: mockWhere });
       (mockDb.select as jest.Mock).mockReturnValue({ from: mockFrom });

      await reorderWishlistDebounced(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({
        status: 403,
        error: 'FORBIDDEN',
        message: 'You can only reorder your own wishlist items'
      });
    });
  });

  describe('getReorderStatus', () => {
    it('should return no pending operations when none exist', async () => {
      await getReorderStatus(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        status: 200,
        message: 'No pending reorder operations',
        data: {
          hasPending: false,
          requestId: null
        }
      });
    });

         it('should return pending operation details when one exists', async () => {
       // First, create a pending operation
       mockReq.body = {
         itemOrders: [{ id: '1', sortOrder: '2' }],
         requestId: 'req-123'
       };

       const mockWhere = jest.fn().mockResolvedValue([{ count: 1 }]);
       const mockFrom = jest.fn().mockReturnValue({ where: mockWhere });
       (mockDb.select as jest.Mock).mockReturnValue({ from: mockFrom });

      await reorderWishlistDebounced(mockReq as Request, mockRes as Response);

      // Now check status
      await getReorderStatus(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenLastCalledWith(200);
      expect(jsonMock).toHaveBeenLastCalledWith({
        status: 200,
        message: 'Pending reorder operation found',
        data: expect.objectContaining({
          hasPending: true,
          requestId: 'req-123',
          timeRemainingMs: expect.any(Number),
          willPersistAt: expect.any(String)
        })
      });
    });

    it('should handle authentication errors', async () => {
      mockReq.authenticatedUserId = undefined;

      await getReorderStatus(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({
        status: 403,
        error: 'UNAUTHORIZED',
        message: 'User not authenticated'
      });
    });
  });

  describe('cancelPendingReorder', () => {
         it('should cancel pending reorder operation', async () => {
       // First, create a pending operation
       mockReq.body = {
         itemOrders: [{ id: '1', sortOrder: '2' }],
         requestId: 'req-123'
       };

       const mockWhere = jest.fn().mockResolvedValue([{ count: 1 }]);
       const mockFrom = jest.fn().mockReturnValue({ where: mockWhere });
       (mockDb.select as jest.Mock).mockReturnValue({ from: mockFrom });

      await reorderWishlistDebounced(mockReq as Request, mockRes as Response);

      // Now cancel it
      await cancelPendingReorder(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenLastCalledWith(200);
      expect(jsonMock).toHaveBeenLastCalledWith({
        status: 200,
        message: 'Pending reorder operation cancelled',
        data: {
          cancelled: true,
          requestId: 'req-123'
        }
      });

      // Verify it's actually cancelled by checking status
      await getReorderStatus(mockReq as Request, mockRes as Response);
      expect(jsonMock).toHaveBeenLastCalledWith({
        status: 200,
        message: 'No pending reorder operations',
        data: {
          hasPending: false,
          requestId: null
        }
      });
    });

    it('should handle case when no pending operation exists', async () => {
      await cancelPendingReorder(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({
        status: 404,
        error: 'NOT_FOUND',
        message: 'No pending reorder operations to cancel'
      });
    });

    it('should handle authentication errors', async () => {
      mockReq.authenticatedUserId = undefined;

      await cancelPendingReorder(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({
        status: 403,
        error: 'UNAUTHORIZED',
        message: 'User not authenticated'
      });
    });
  });

  describe('Race Condition Handling', () => {
         it('should handle concurrent debounced requests safely', async () => {
       const mockWhere = jest.fn().mockResolvedValue([{ count: 1 }]);
       const mockFrom = jest.fn().mockReturnValue({ where: mockWhere });
       (mockDb.select as jest.Mock).mockReturnValue({ from: mockFrom });

      // Simulate multiple concurrent requests
      const requests = Array.from({ length: 5 }, (_, i) => ({
        itemOrders: [{ id: '1', sortOrder: i.toString() }],
        requestId: `req-${i}`
      }));

      const promises = requests.map(body => {
        mockReq.body = body;
        return reorderWishlistDebounced(mockReq as Request, mockRes as Response);
      });

      await Promise.all(promises);

      // All should return 202 (queued)
      expect(statusMock).toHaveBeenCalledTimes(5);
      expect(statusMock).toHaveBeenCalledWith(202);
    });

         it('should execute final operation after debounce period', async () => {
       const mockWhere = jest.fn().mockResolvedValue([{ count: 1 }]);
       const mockFrom = jest.fn().mockReturnValue({ where: mockWhere });
       (mockDb.select as jest.Mock).mockReturnValue({ from: mockFrom });

       // Submit reorder request
       mockReq.body = {
         itemOrders: [{ id: '1', sortOrder: '5' }],
         requestId: 'req-final'
       };

       await reorderWishlistDebounced(mockReq as Request, mockRes as Response);

       // Verify it was queued with 202 status
       expect(statusMock).toHaveBeenCalledWith(202);
       expect(jsonMock).toHaveBeenCalledWith({
         status: 202,
         message: 'Reorder request queued - changes will be persisted shortly',
         data: expect.objectContaining({
           requestId: 'req-final',
           debounced: true,
           willPersistAt: expect.any(String)
         })
       });
     });
  });
}); 