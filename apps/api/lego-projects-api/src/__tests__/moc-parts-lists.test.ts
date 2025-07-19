// Mock the db module before importing handlers
jest.mock('../db/client', () => ({
  db: {
    select: jest.fn().mockReturnValue({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue([]),
          orderBy: jest.fn().mockReturnValue([]),
          innerJoin: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              limit: jest.fn().mockReturnValue([])
            })
          })
        }),
        innerJoin: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            orderBy: jest.fn().mockReturnValue([])
          })
        })
      })
    }),
    insert: jest.fn().mockReturnValue({
      values: jest.fn().mockReturnValue({
        returning: jest.fn().mockReturnValue([])
      })
    }),
    update: jest.fn().mockReturnValue({
      set: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          returning: jest.fn().mockReturnValue([])
        })
      })
    }),
    delete: jest.fn().mockReturnValue({
      where: jest.fn().mockReturnValue([])
    })
  }
}));

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { Request, Response } from 'express';
import { 
  getMocPartsLists, 
  createMocPartsList, 
  updateMocPartsList, 
  updatePartsListStatus,
  deleteMocPartsList,
  getUserPartsListSummary
} from '../handlers/moc-parts-lists';
import { db } from '../db/client';

// Create properly typed mocks
const mockDb = db as jest.Mocked<typeof db>;

function mockRequest(overrides: Partial<Request> = {}): Request {
  return {
    authenticatedUserId: 'user-123',
    params: {},
    body: {},
    ...overrides,
  } as Request;
}

function mockResponse(): Response {
  const res = {} as Response;
  res.status = jest.fn().mockReturnValue(res) as any;
  res.json = jest.fn().mockReturnValue(res) as any;
  return res;
}

describe('MOC Parts Lists Handlers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getMocPartsLists', () => {
    it('should return parts lists for authenticated user with valid MOC', async () => {
      const req = mockRequest({
        params: { mocId: 'moc-123' }
      });
      const res = mockResponse();

      // Mock MOC exists and belongs to user
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue([{ id: 'moc-123', userId: 'user-123' }])
          })
        })
      } as any);

      // Mock parts lists query
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            orderBy: jest.fn().mockReturnValue([
              { id: 'parts-1', title: 'Main Parts', built: false },
              { id: 'parts-2', title: 'Detail Parts', built: true }
            ])
          })
        })
      } as any);

      await getMocPartsLists(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        statusCode: 200,
        message: 'Parts lists retrieved successfully',
        data: [
          { id: 'parts-1', title: 'Main Parts', built: false },
          { id: 'parts-2', title: 'Detail Parts', built: true }
        ]
      });
    });

    it('should return 403 for unauthenticated user', async () => {
      const req = mockRequest({
        authenticatedUserId: undefined,
        params: { mocId: 'moc-123' }
      });
      const res = mockResponse();

      await getMocPartsLists(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        statusCode: 403,
        error: 'UNAUTHORIZED',
        message: 'User not authenticated'
      });
    });

    it('should return 404 for non-existent or unauthorized MOC', async () => {
      const req = mockRequest({
        params: { mocId: 'moc-123' }
      });
      const res = mockResponse();

      // Mock MOC not found
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue([])
          })
        })
      } as any);

      await getMocPartsLists(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        statusCode: 404,
        error: 'NOT_FOUND',
        message: 'MOC instruction not found or not authorized'
      });
    });

    it('should handle database errors', async () => {
      const req = mockRequest({
        params: { mocId: 'moc-123' }
      });
      const res = mockResponse();

      mockDb.select.mockImplementationOnce(() => {
        throw new Error('Database connection failed');
      });

      await getMocPartsLists(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        statusCode: 500,
        error: 'INTERNAL_ERROR',
        message: 'Failed to retrieve parts lists'
      });
    });
  });

  describe('createMocPartsList', () => {
    it('should create parts list with valid data', async () => {
      const req = mockRequest({
        params: { mocId: 'moc-123' },
        body: {
          title: 'New Parts List',
          description: 'Test description',
          totalPartsCount: '100',
          costEstimate: '50.00'
        }
      });
      const res = mockResponse();

      // Mock MOC exists and belongs to user
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue([{ id: 'moc-123', userId: 'user-123' }])
          })
        })
      } as any);

      // Mock successful insert
      mockDb.insert.mockReturnValueOnce({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockReturnValue([{
            id: 'parts-new',
            mocId: 'moc-123',
            title: 'New Parts List',
            description: 'Test description',
            built: false,
            purchased: false
          }])
        })
      } as any);

      await createMocPartsList(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        statusCode: 201,
        message: 'Parts list created successfully',
        data: expect.objectContaining({
          title: 'New Parts List',
          built: false,
          purchased: false
        })
      });
    });

    it('should return 400 for invalid input data', async () => {
      const req = mockRequest({
        params: { mocId: 'moc-123' },
        body: {
          title: '', // Invalid: empty title
          description: 'Test description'
        }
      });
      const res = mockResponse();

      await createMocPartsList(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        statusCode: 400,
        error: 'VALIDATION_ERROR',
        message: 'Invalid input data',
        details: expect.any(Array)
      });
    });

    it('should return 403 for unauthenticated user', async () => {
      const req = mockRequest({
        authenticatedUserId: undefined,
        params: { mocId: 'moc-123' },
        body: { title: 'Test' }
      });
      const res = mockResponse();

      await createMocPartsList(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should return 404 for non-existent MOC', async () => {
      const req = mockRequest({
        params: { mocId: 'moc-123' },
        body: { title: 'Test Parts List' }
      });
      const res = mockResponse();

      // Mock MOC not found
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue([])
          })
        })
      } as any);

      await createMocPartsList(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('updateMocPartsList', () => {
    it('should update parts list with valid data', async () => {
      const req = mockRequest({
        params: { mocId: 'moc-123', partsListId: 'parts-123' },
        body: {
          title: 'Updated Parts List',
          built: true,
          inventoryPercentage: '85.50'
        }
      });
      const res = mockResponse();

      // Mock parts list exists and user is authorized
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          innerJoin: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              limit: jest.fn().mockReturnValue([{
                partsListId: 'parts-123',
                mocUserId: 'user-123'
              }])
            })
          })
        })
      } as any);

      // Mock successful update
      mockDb.update.mockReturnValueOnce({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            returning: jest.fn().mockReturnValue([{
              id: 'parts-123',
              title: 'Updated Parts List',
              built: true,
              inventoryPercentage: '85.50'
            }])
          })
        })
      } as any);

      await updateMocPartsList(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        statusCode: 200,
        message: 'Parts list updated successfully',
        data: expect.objectContaining({
          title: 'Updated Parts List',
          built: true
        })
      });
    });

    it('should return 400 for invalid inventory percentage', async () => {
      const req = mockRequest({
        params: { mocId: 'moc-123', partsListId: 'parts-123' },
        body: {
          inventoryPercentage: '150.00' // Invalid: over 100%
        }
      });
      const res = mockResponse();

      await updateMocPartsList(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 404 for non-existent parts list', async () => {
      const req = mockRequest({
        params: { mocId: 'moc-123', partsListId: 'parts-123' },
        body: { title: 'Updated' }
      });
      const res = mockResponse();

      // Mock parts list not found
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          innerJoin: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              limit: jest.fn().mockReturnValue([])
            })
          })
        })
      } as any);

      await updateMocPartsList(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('updatePartsListStatus', () => {
    it('should update status fields successfully', async () => {
      const req = mockRequest({
        params: { mocId: 'moc-123', partsListId: 'parts-123' },
        body: {
          built: true,
          purchased: true,
          inventoryPercentage: '95.50',
          acquiredPartsCount: '190',
          actualCost: '89.99',
          notes: 'Almost complete'
        }
      });
      const res = mockResponse();

      // Mock parts list exists and user is authorized
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          innerJoin: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              limit: jest.fn().mockReturnValue([{
                partsListId: 'parts-123',
                mocUserId: 'user-123'
              }])
            })
          })
        })
      } as any);

      // Mock successful update
      mockDb.update.mockReturnValueOnce({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            returning: jest.fn().mockReturnValue([{
              id: 'parts-123',
              built: true,
              purchased: true,
              inventoryPercentage: '95.50',
              actualCost: '89.99'
            }])
          })
        })
      } as any);

      await updatePartsListStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        statusCode: 200,
        message: 'Parts list status updated successfully',
        data: expect.objectContaining({
          built: true,
          purchased: true
        })
      });
    });

    it('should handle partial status updates', async () => {
      const req = mockRequest({
        params: { mocId: 'moc-123', partsListId: 'parts-123' },
        body: {
          built: true
          // Only updating built status
        }
      });
      const res = mockResponse();

      // Mock parts list exists
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          innerJoin: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              limit: jest.fn().mockReturnValue([{
                partsListId: 'parts-123',
                mocUserId: 'user-123'
              }])
            })
          })
        })
      } as any);

      // Mock successful update
      mockDb.update.mockReturnValueOnce({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            returning: jest.fn().mockReturnValue([{
              id: 'parts-123',
              built: true
            }])
          })
        })
      } as any);

      await updatePartsListStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('deleteMocPartsList', () => {
    it('should delete parts list successfully', async () => {
      const req = mockRequest({
        params: { mocId: 'moc-123', partsListId: 'parts-123' }
      });
      const res = mockResponse();

      // Mock parts list exists and user is authorized
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          innerJoin: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              limit: jest.fn().mockReturnValue([{
                partsListId: 'parts-123',
                mocUserId: 'user-123'
              }])
            })
          })
        })
      } as any);

      // Mock successful delete
      mockDb.delete.mockReturnValueOnce({
        where: jest.fn().mockReturnValue(Promise.resolve())
      } as any);

      await deleteMocPartsList(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        statusCode: 200,
        message: 'Parts list deleted successfully',
        data: null
      });
    });

    it('should return 404 for non-existent parts list', async () => {
      const req = mockRequest({
        params: { mocId: 'moc-123', partsListId: 'parts-123' }
      });
      const res = mockResponse();

      // Mock parts list not found
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          innerJoin: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              limit: jest.fn().mockReturnValue([])
            })
          })
        })
      } as any);

      await deleteMocPartsList(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('getUserPartsListSummary', () => {
    it('should return user summary with statistics', async () => {
      const req = mockRequest();
      const res = mockResponse();

      // Mock summary data
      const mockSummaryData = [
        {
          totalPartsLists: 'parts-1',
          built: true,
          purchased: true,
          mocTitle: 'Robot MOC',
          partsListTitle: 'Main Parts',
          inventoryPercentage: '90.00'
        },
        {
          totalPartsLists: 'parts-2',
          built: false,
          purchased: true,
          mocTitle: 'Car MOC',
          partsListTitle: 'Wheels',
          inventoryPercentage: '75.50'
        },
        {
          totalPartsLists: 'parts-3',
          built: true,
          purchased: false,
          mocTitle: 'House MOC',
          partsListTitle: 'Foundation',
          inventoryPercentage: '60.25'
        }
      ];

      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          innerJoin: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              orderBy: jest.fn().mockReturnValue(mockSummaryData)
            })
          })
        })
      } as any);

      await getUserPartsListSummary(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        statusCode: 200,
        message: 'Parts list summary retrieved successfully',
        data: {
          statistics: {
            totalPartsLists: 3,
            builtCount: 2,
            purchasedCount: 2,
            averageInventoryPercentage: '75.25'
          },
          recentPartsLists: mockSummaryData.slice(0, 10)
        }
      });
    });

    it('should handle empty summary data', async () => {
      const req = mockRequest();
      const res = mockResponse();

      // Mock empty summary
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          innerJoin: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              orderBy: jest.fn().mockReturnValue([])
            })
          })
        })
      } as any);

      await getUserPartsListSummary(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        statusCode: 200,
        message: 'Parts list summary retrieved successfully',
        data: {
          statistics: {
            totalPartsLists: 0,
            builtCount: 0,
            purchasedCount: 0,
            averageInventoryPercentage: '0.00'
          },
          recentPartsLists: []
        }
      });
    });

    it('should return 403 for unauthenticated user', async () => {
      const req = mockRequest({
        authenticatedUserId: undefined
      });
      const res = mockResponse();

      await getUserPartsListSummary(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should handle database errors', async () => {
      const req = mockRequest();
      const res = mockResponse();

      mockDb.select.mockImplementationOnce(() => {
        throw new Error('Database error');
      });

      await getUserPartsListSummary(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        statusCode: 500,
        error: 'INTERNAL_ERROR',
        message: 'Failed to retrieve parts list summary'
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle unexpected errors gracefully', async () => {
      const req = mockRequest({
        params: { mocId: 'moc-123' }
      });
      const res = mockResponse();

      // Force an unexpected error
      mockDb.select.mockImplementationOnce(() => {
        throw new Error('Unexpected database error');
      });

      await getMocPartsLists(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        statusCode: 500,
        error: 'INTERNAL_ERROR',
        message: 'Failed to retrieve parts lists'
      });
    });

    it('should handle malformed UUIDs', async () => {
      const req = mockRequest({
        params: { mocId: 'invalid-uuid', partsListId: 'also-invalid' },
        body: { title: 'Test' }
      });
      const res = mockResponse();

      // This would typically be caught by route validation, but test handler resilience
      mockDb.select.mockImplementationOnce(() => {
        throw new Error('Invalid UUID format');
      });

      await updateMocPartsList(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
}); 