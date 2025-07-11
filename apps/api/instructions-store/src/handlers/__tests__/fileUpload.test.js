const { handler } = require('../fileUpload');

// Mock AWS SDK
const mockDynamoDB = {
  put: jest.fn().mockReturnValue({ promise: jest.fn().mockResolvedValue({}) }),
  get: jest.fn().mockReturnValue({ promise: jest.fn().mockResolvedValue({ Item: null }) }),
  delete: jest.fn().mockReturnValue({ promise: jest.fn().mockResolvedValue({}) }),
  query: jest.fn().mockReturnValue({ promise: jest.fn().mockResolvedValue({ Items: [] }) })
};

const mockS3 = {
  getSignedUrlPromise: jest.fn().mockResolvedValue('https://presigned-url.com'),
  deleteObject: jest.fn().mockReturnValue({ promise: jest.fn().mockResolvedValue({}) })
};

jest.mock('aws-sdk', () => ({
  DynamoDB: {
    DocumentClient: jest.fn(() => mockDynamoDB)
  },
  S3: jest.fn(() => mockS3)
}));

describe('FileUpload Handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.FILES_TABLE = 'test-files-table';
    process.env.UPLOADS_BUCKET = 'test-uploads-bucket';
  });

  describe('uploadFile', () => {
    const validInput = {
      name: 'test.pdf',
      size: 1024000,
      type: 'application/pdf',
      userId: 'user123'
    };

    it('should successfully upload a file', async () => {
      const event = {
        arguments: { input: validInput },
        fieldName: 'uploadFile'
      };

      const result = await handler(event);

      expect(result).toHaveProperty('file');
      expect(result).toHaveProperty('presignedUrl');
      expect(result).toHaveProperty('expiresAt');
      expect(result.file.name).toBe(validInput.name);
      expect(result.file.userId).toBe(validInput.userId);
      expect(mockDynamoDB.put).toHaveBeenCalled();
      expect(mockS3.getSignedUrlPromise).toHaveBeenCalled();
    });

    it('should reject files larger than 50MB', async () => {
      const largeFileInput = {
        ...validInput,
        size: 60 * 1024 * 1024 // 60MB
      };

      const event = {
        arguments: { input: largeFileInput },
        fieldName: 'uploadFile'
      };

      await expect(handler(event)).rejects.toThrow('File size exceeds 50MB limit');
    });

    it('should reject unsupported file types', async () => {
      const invalidTypeInput = {
        ...validInput,
        type: 'application/unsupported'
      };

      const event = {
        arguments: { input: invalidTypeInput },
        fieldName: 'uploadFile'
      };

      await expect(handler(event)).rejects.toThrow('File type not allowed');
    });

    it('should require all input fields', async () => {
      const incompleteInput = {
        name: 'test.pdf',
        size: 1024000
        // missing type and userId
      };

      const event = {
        arguments: { input: incompleteInput },
        fieldName: 'uploadFile'
      };

      await expect(handler(event)).rejects.toThrow('Missing required fields');
    });
  });

  describe('deleteFile', () => {
    const validDeleteInput = {
      id: 'file123',
      userId: 'user123'
    };

    it('should successfully delete a file', async () => {
      mockDynamoDB.get.mockReturnValue({
        promise: jest.fn().mockResolvedValue({
          Item: {
            id: 'file123',
            userId: 'user123',
            name: 'test.pdf'
          }
        })
      });

      const event = {
        arguments: { input: validDeleteInput },
        fieldName: 'deleteFile'
      };

      const result = await handler(event);

      expect(result.success).toBe(true);
      expect(result.message).toBe('File deleted successfully');
      expect(mockDynamoDB.delete).toHaveBeenCalled();
      expect(mockS3.deleteObject).toHaveBeenCalled();
    });

    it('should reject deletion of non-existent file', async () => {
      const event = {
        arguments: { input: validDeleteInput },
        fieldName: 'deleteFile'
      };

      await expect(handler(event)).rejects.toThrow('File not found');
    });

    it('should reject deletion by wrong user', async () => {
      mockDynamoDB.get.mockReturnValue({
        promise: jest.fn().mockResolvedValue({
          Item: {
            id: 'file123',
            userId: 'user456', // different user
            name: 'test.pdf'
          }
        })
      });

      const event = {
        arguments: { input: validDeleteInput },
        fieldName: 'deleteFile'
      };

      await expect(handler(event)).rejects.toThrow('Unauthorized');
    });
  });

  describe('getFile', () => {
    it('should return file details', async () => {
      const fileData = {
        id: 'file123',
        name: 'test.pdf',
        size: 1024000,
        type: 'application/pdf',
        userId: 'user123'
      };

      mockDynamoDB.get.mockReturnValue({
        promise: jest.fn().mockResolvedValue({
          Item: fileData
        })
      });

      const event = {
        arguments: { id: 'file123' },
        fieldName: 'getFile'
      };

      const result = await handler(event);

      expect(result).toEqual(fileData);
      expect(mockDynamoDB.get).toHaveBeenCalledWith({
        TableName: 'test-files-table',
        Key: { id: 'file123' }
      });
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
      const files = [
        { id: 'file1', name: 'test1.pdf', userId: 'user123' },
        { id: 'file2', name: 'test2.pdf', userId: 'user123' }
      ];

      mockDynamoDB.query.mockReturnValue({
        promise: jest.fn().mockResolvedValue({
          Items: files
        })
      });

      const event = {
        arguments: { userId: 'user123', limit: 10 },
        fieldName: 'listFiles'
      };

      const result = await handler(event);

      expect(result.items).toEqual(files);
      expect(mockDynamoDB.query).toHaveBeenCalledWith({
        TableName: 'test-files-table',
        IndexName: 'UserIdIndex',
        KeyConditionExpression: 'userId = :userId',
        ExpressionAttributeValues: {
          ':userId': 'user123'
        },
        ScanIndexForward: false,
        Limit: 10
      });
    });

    it('should require userId', async () => {
      const event = {
        arguments: {},
        fieldName: 'listFiles'
      };

      await expect(handler(event)).rejects.toThrow('User ID is required');
    });
  });

  describe('unsupported field', () => {
    it('should throw error for unsupported field', async () => {
      const event = {
        arguments: {},
        fieldName: 'unsupportedField'
      };

      await expect(handler(event)).rejects.toThrow('Unsupported field: unsupportedField');
    });
  });
}); 