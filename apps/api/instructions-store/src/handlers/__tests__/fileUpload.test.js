// Set environment variables first
process.env.FILES_TABLE = 'test-files-table';
process.env.UPLOADS_BUCKET = 'test-uploads-bucket';
process.env.AWS_REGION = 'us-east-1';
process.env.AWS_DEFAULT_REGION = 'us-east-1';

// Mock AWS SDK at the very top before any imports
const mockDynamoDB = {
  put: jest.fn(({ TableName, Item }) => {
    if (!TableName) throw new Error('Missing required key \'TableName\' in params');
    return { promise: jest.fn().mockResolvedValue({}) };
  }),
  get: jest.fn(({ TableName, Key }) => {
    if (!TableName) throw new Error('Missing required key \'TableName\' in params');
    if (Key && Key.id === 'file123') {
      return { promise: jest.fn().mockResolvedValue({ Item: { id: 'file123', name: 'test.txt', userId: 'user123' } }) };
    }
    return { promise: jest.fn().mockResolvedValue({ Item: null }) };
  }),
  delete: jest.fn(({ TableName, Key }) => {
    if (!TableName) throw new Error('Missing required key \'TableName\' in params');
    return { promise: jest.fn().mockResolvedValue({}) };
  }),
  query: jest.fn(({ TableName, KeyConditionExpression, ExpressionAttributeValues }) => {
    if (!TableName) throw new Error('Missing required key \'TableName\' in params');
    if (ExpressionAttributeValues && ExpressionAttributeValues[':userId'] === 'user123') {
      return { promise: jest.fn().mockResolvedValue({ Items: [{ id: 'file123', name: 'test.txt', userId: 'user123' }] }) };
    }
    return { promise: jest.fn().mockResolvedValue({ Items: [] }) };
  })
};

const mockS3 = {
  getSignedUrlPromise: jest.fn().mockResolvedValue('https://presigned-url.com'),
  deleteObject: jest.fn(({ Bucket, Key }) => {
    if (!Bucket) throw new Error('Missing required key \'Bucket\' in params');
    return { promise: jest.fn().mockResolvedValue({}) };
  })
};

// Mock AWS SDK before requiring the handler
jest.mock('aws-sdk', () => ({
  DynamoDB: {
    DocumentClient: jest.fn(() => mockDynamoDB)
  },
  S3: jest.fn(() => mockS3)
}));

// Now require the handler after mocks are set up
const { handler } = require('../fileUpload');

describe('FileUpload Handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('uploadFile', () => {
    const validInput = {
      name: 'test.txt',
      type: 'text/plain',
      size: 1024
    };

    it('should successfully upload a file', async () => {
      jest.setTimeout(15000);
      const event = {
        arguments: { input: { ...validInput, userId: 'user123' } },
        fieldName: 'uploadFile'
      };

      const result = await handler(event);

      expect(result).toHaveProperty('file');
      expect(result).toHaveProperty('presignedUrl');
      expect(result).toHaveProperty('expiresAt');
      expect(result.file.name).toBe(validInput.name);
      expect(result.file.type).toBe(validInput.type);
      expect(result.file.size).toBe(validInput.size);
      expect(result.presignedUrl).toBe('https://presigned-url.com');
    });

    it('should reject invalid file input', async () => {
      const invalidInput = {
        name: '',
        type: 'text/plain',
        size: 1024
      };

      const event = {
        arguments: { input: invalidInput },
        fieldName: 'uploadFile'
      };

      await expect(handler(event)).rejects.toThrow();
    });
  });

  describe('deleteFile', () => {
    it('should successfully delete a file', async () => {
      const event = {
        arguments: { input: { id: 'file123', userId: 'user123' } },
        fieldName: 'deleteFile'
      };

      const result = await handler(event);

      expect(result.success).toBe(true);
      expect(result.message).toBe('File deleted successfully');
      expect(mockDynamoDB.delete).toHaveBeenCalledWith({
        TableName: 'test-files-table',
        Key: { id: 'file123' }
      });
    });

    it('should reject deletion of non-existent file', async () => {
      const event = {
        arguments: { input: { id: 'nonexistent', userId: 'user123' } },
        fieldName: 'deleteFile'
      };

      await expect(handler(event)).rejects.toThrow();
    });

    it('should reject deletion by wrong user', async () => {
      const event = {
        arguments: { input: { id: 'file123', userId: 'wronguser' } },
        fieldName: 'deleteFile'
      };

      await expect(handler(event)).rejects.toThrow();
    });
  });

  describe('getFile', () => {
    it('should return file details', async () => {
      const event = {
        arguments: { id: 'file123' },
        fieldName: 'getFile'
      };

      const result = await handler(event);

      expect(result).toHaveProperty('id', 'file123');
      expect(result).toHaveProperty('name', 'test.txt');
      expect(result).toHaveProperty('userId', 'user123');
    });

    it('should return null for non-existent file', async () => {
      const event = {
        arguments: { id: 'nonexistent' },
        fieldName: 'getFile'
      };

      const result = await handler(event);

      expect(result).toBeNull();
    });
  });

  describe('listFiles', () => {
    it('should return list of files for user', async () => {
      const event = {
        arguments: { userId: 'user123' },
        fieldName: 'listFiles'
      };

      const result = await handler(event);

      expect(result).toHaveProperty('items');
      expect(result).toHaveProperty('nextToken');
      expect(Array.isArray(result.items)).toBe(true);
      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toHaveProperty('id', 'file123');
      expect(result.items[0]).toHaveProperty('name', 'test.txt');
    });

    it('should return empty array for user with no files', async () => {
      const event = {
        arguments: { userId: 'user456' },
        fieldName: 'listFiles'
      };

      const result = await handler(event);

      expect(result).toHaveProperty('items');
      expect(result).toHaveProperty('nextToken');
      expect(Array.isArray(result.items)).toBe(true);
      expect(result.items).toHaveLength(0);
    });
  });
}); 