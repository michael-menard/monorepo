import { indexMoc, updateMoc, deleteMoc, searchMocs, initializeMocIndex } from '../utils/elasticsearch';

// Mock the Elasticsearch client
jest.mock('@elastic/elasticsearch', () => ({
  Client: jest.fn().mockImplementation(() => ({
    cluster: {
      health: jest.fn().mockResolvedValue({ status: 'green' })
    },
    index: jest.fn().mockResolvedValue({ result: 'created' }),
    update: jest.fn().mockResolvedValue({ result: 'updated' }),
    delete: jest.fn().mockResolvedValue({ result: 'deleted' }),
    search: jest.fn().mockResolvedValue({
      hits: {
        hits: [
          {
            _source: {
              id: 'test-moc-id',
              title: 'Test MOC',
              description: 'Test description',
              tags: ['test', 'moc'],
              userId: 'test-user-id',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }
          }
        ],
        total: { value: 1 }
      }
    }),
    indices: {
      exists: jest.fn().mockResolvedValue(false),
      create: jest.fn().mockResolvedValue({ acknowledged: true })
    }
  }))
}));

describe('MOC Elasticsearch Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize MOC index', async () => {
    const result = await initializeMocIndex();
    expect(result).toBeUndefined();
  });

  it('should index a MOC', async () => {
    const mockMoc = {
      id: 'test-moc-id',
      userId: 'test-user-id',
      title: 'Test MOC',
      description: 'Test description',
      tags: ['test', 'moc'],
      thumbnailUrl: null,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await indexMoc(mockMoc);
    expect(result).toBeUndefined();
  });

  it('should update a MOC', async () => {
    const mockMoc = {
      id: 'test-moc-id',
      userId: 'test-user-id',
      title: 'Updated Test MOC',
      description: 'Updated description',
      tags: ['test', 'moc', 'updated'],
      thumbnailUrl: null,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await updateMoc(mockMoc);
    expect(result).toBeUndefined();
  });

  it('should delete a MOC', async () => {
    const result = await deleteMoc('test-moc-id');
    expect(result).toBeUndefined();
  });

  it('should search MOCs', async () => {
    const searchParams = {
      userId: 'test-user-id',
      query: 'test',
      tag: 'moc',
      from: 0,
      size: 20
    };

    const result = await searchMocs(searchParams);
    expect(result).toEqual({
      hits: [
        {
          id: 'test-moc-id',
          title: 'Test MOC',
          description: 'Test description',
          tags: ['test', 'moc'],
          userId: 'test-user-id',
          createdAt: expect.any(String),
          updatedAt: expect.any(String)
        }
      ],
      total: 1
    });
  });

  it('should handle search with no results', async () => {
    // Mock empty search results
    const { Client } = require('@elastic/elasticsearch');
    Client.mockImplementation(() => ({
      cluster: {
        health: jest.fn().mockResolvedValue({ status: 'green' })
      },
      search: jest.fn().mockResolvedValue({
        hits: {
          hits: [],
          total: { value: 0 }
        }
      })
    }));

    const searchParams = {
      userId: 'test-user-id',
      query: 'nonexistent',
      from: 0,
      size: 20
    };

    const result = await searchMocs(searchParams);
    expect(result).toEqual({
      hits: [],
      total: 0
    });
  });

  it('should handle Elasticsearch errors gracefully', async () => {
    // Mock Elasticsearch error
    const { Client } = require('@elastic/elasticsearch');
    Client.mockImplementation(() => ({
      cluster: {
        health: jest.fn().mockRejectedValue(new Error('Connection failed'))
      },
      search: jest.fn().mockRejectedValue(new Error('Search failed'))
    }));

    const searchParams = {
      userId: 'test-user-id',
      query: 'test',
      from: 0,
      size: 20
    };

    const result = await searchMocs(searchParams);
    expect(result).toBeNull();
  });
}); 