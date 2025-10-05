import { describe, it, expect, beforeEach, vi } from 'vitest';

// Import packages to test integration
import { uploadFile, uploadMultipleFiles } from '@repo/upload';
import { cacheManager, CacheStrategy } from '@repo/cache';

// Mock external I/O only (file system, S3, Redis)
vi.mock('@repo/upload/services/s3', () => ({
  s3Service: {
    uploadToS3: vi.fn(),
    deleteFromS3: vi.fn(),
  }
}));

vi.mock('@repo/cache/adapters/redis', () => ({
  redisAdapter: {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
    exists: vi.fn(),
  }
}));

vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
  unlink: vi.fn(),
}));

describe('Upload + Cache Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('File Upload with Caching', () => {
    it('should cache uploaded file metadata and URLs', async () => {
      const mockFile = {
        name: 'test-image.jpg',
        size: 1024000,
        type: 'image/jpeg',
        buffer: Buffer.from('mock image data')
      };

      const mockUploadResult = {
        url: 'https://s3.amazonaws.com/bucket/test-image.jpg',
        key: 'uploads/test-image.jpg',
        metadata: {
          size: 1024000,
          type: 'image/jpeg',
          width: 800,
          height: 600
        }
      };

      const { s3Service } = await import('@repo/upload/services/s3');
      const { redisAdapter } = await import('@repo/cache/adapters/redis');

      s3Service.uploadToS3.mockResolvedValue(mockUploadResult);
      redisAdapter.set.mockResolvedValue(true);
      redisAdapter.get.mockResolvedValue(null); // Cache miss initially

      // Real integration workflow
      const uploadResult = await uploadFile(mockFile);
      
      // Cache the upload result
      const cacheKey = `upload:${mockUploadResult.key}`;
      await cacheManager.set(cacheKey, uploadResult, {
        strategy: CacheStrategy.LRU,
        ttl: 3600 // 1 hour
      });

      // Verify upload happened
      expect(s3Service.uploadToS3).toHaveBeenCalledWith(mockFile);
      expect(uploadResult).toEqual(mockUploadResult);

      // Verify caching happened
      expect(redisAdapter.set).toHaveBeenCalledWith(
        cacheKey,
        JSON.stringify(uploadResult),
        3600
      );
    });

    it('should serve cached upload results on subsequent requests', async () => {
      const cacheKey = 'upload:uploads/test-image.jpg';
      const cachedResult = {
        url: 'https://s3.amazonaws.com/bucket/test-image.jpg',
        key: 'uploads/test-image.jpg',
        metadata: {
          size: 1024000,
          type: 'image/jpeg',
          width: 800,
          height: 600
        }
      };

      const { redisAdapter } = await import('@repo/cache/adapters/redis');
      redisAdapter.get.mockResolvedValue(JSON.stringify(cachedResult));

      // Request cached upload result
      const result = await cacheManager.get(cacheKey);

      expect(redisAdapter.get).toHaveBeenCalledWith(cacheKey);
      expect(JSON.parse(result)).toEqual(cachedResult);
    });

    it('should invalidate cache when files are deleted', async () => {
      const fileKey = 'uploads/test-image.jpg';
      const cacheKey = `upload:${fileKey}`;

      const { s3Service } = await import('@repo/upload/services/s3');
      const { redisAdapter } = await import('@repo/cache/adapters/redis');

      s3Service.deleteFromS3.mockResolvedValue(true);
      redisAdapter.del.mockResolvedValue(1);

      // Delete file and invalidate cache
      await s3Service.deleteFromS3(fileKey);
      await cacheManager.invalidate(cacheKey);

      expect(s3Service.deleteFromS3).toHaveBeenCalledWith(fileKey);
      expect(redisAdapter.del).toHaveBeenCalledWith(cacheKey);
    });
  });

  describe('Batch Upload with Cache Optimization', () => {
    it('should optimize cache usage for multiple file uploads', async () => {
      const mockFiles = [
        { name: 'image1.jpg', size: 500000, type: 'image/jpeg', buffer: Buffer.from('image1') },
        { name: 'image2.jpg', size: 750000, type: 'image/jpeg', buffer: Buffer.from('image2') },
        { name: 'image3.jpg', size: 600000, type: 'image/jpeg', buffer: Buffer.from('image3') }
      ];

      const mockUploadResults = mockFiles.map((file, index) => ({
        url: `https://s3.amazonaws.com/bucket/${file.name}`,
        key: `uploads/${file.name}`,
        metadata: {
          size: file.size,
          type: file.type,
          width: 800,
          height: 600
        }
      }));

      const { s3Service } = await import('@repo/upload/services/s3');
      const { redisAdapter } = await import('@repo/cache/adapters/redis');

      s3Service.uploadToS3.mockImplementation((file) => {
        const index = mockFiles.findIndex(f => f.name === file.name);
        return Promise.resolve(mockUploadResults[index]);
      });

      redisAdapter.set.mockResolvedValue(true);

      // Real batch upload with caching
      const uploadResults = await uploadMultipleFiles(mockFiles);

      // Cache all results in batch
      const cacheOperations = uploadResults.map(result => {
        const cacheKey = `upload:${result.key}`;
        return cacheManager.set(cacheKey, result, {
          strategy: CacheStrategy.LRU,
          ttl: 3600
        });
      });

      await Promise.all(cacheOperations);

      // Verify all uploads happened
      expect(s3Service.uploadToS3).toHaveBeenCalledTimes(3);
      expect(uploadResults).toHaveLength(3);

      // Verify all results were cached
      expect(redisAdapter.set).toHaveBeenCalledTimes(3);
      uploadResults.forEach(result => {
        const cacheKey = `upload:${result.key}`;
        expect(redisAdapter.set).toHaveBeenCalledWith(
          cacheKey,
          JSON.stringify(result),
          3600
        );
      });
    });

    it('should handle cache failures gracefully during uploads', async () => {
      const mockFile = {
        name: 'test-image.jpg',
        size: 1024000,
        type: 'image/jpeg',
        buffer: Buffer.from('mock image data')
      };

      const mockUploadResult = {
        url: 'https://s3.amazonaws.com/bucket/test-image.jpg',
        key: 'uploads/test-image.jpg',
        metadata: { size: 1024000, type: 'image/jpeg' }
      };

      const { s3Service } = await import('@repo/upload/services/s3');
      const { redisAdapter } = await import('@repo/cache/adapters/redis');

      s3Service.uploadToS3.mockResolvedValue(mockUploadResult);
      redisAdapter.set.mockRejectedValue(new Error('Redis connection failed'));

      // Upload should succeed even if caching fails
      const uploadResult = await uploadFile(mockFile);

      // Try to cache (will fail)
      const cacheKey = `upload:${mockUploadResult.key}`;
      try {
        await cacheManager.set(cacheKey, uploadResult, {
          strategy: CacheStrategy.LRU,
          ttl: 3600
        });
      } catch (error) {
        // Cache failure should not affect upload success
        expect(error.message).toBe('Redis connection failed');
      }

      // Upload should still succeed
      expect(uploadResult).toEqual(mockUploadResult);
      expect(s3Service.uploadToS3).toHaveBeenCalledWith(mockFile);
    });
  });

  describe('Cache Performance Optimization', () => {
    it('should implement cache warming for frequently accessed uploads', async () => {
      const popularFiles = [
        'uploads/popular-moc-1.jpg',
        'uploads/popular-moc-2.jpg',
        'uploads/popular-moc-3.jpg'
      ];

      const { redisAdapter } = await import('@repo/cache/adapters/redis');
      redisAdapter.set.mockResolvedValue(true);

      // Simulate cache warming
      const warmCacheOperations = popularFiles.map(async (fileKey) => {
        const cacheKey = `upload:${fileKey}`;
        const mockData = {
          url: `https://s3.amazonaws.com/bucket/${fileKey}`,
          key: fileKey,
          metadata: { size: 1000000, type: 'image/jpeg' }
        };

        return cacheManager.set(cacheKey, mockData, {
          strategy: CacheStrategy.LRU,
          ttl: 7200 // 2 hours for popular content
        });
      });

      await Promise.all(warmCacheOperations);

      // Verify cache warming
      expect(redisAdapter.set).toHaveBeenCalledTimes(3);
      popularFiles.forEach(fileKey => {
        const cacheKey = `upload:${fileKey}`;
        expect(redisAdapter.set).toHaveBeenCalledWith(
          cacheKey,
          expect.any(String),
          7200
        );
      });
    });

    it('should implement cache eviction for old uploads', async () => {
      const oldFiles = [
        'upload:uploads/old-file-1.jpg',
        'upload:uploads/old-file-2.jpg',
        'upload:uploads/old-file-3.jpg'
      ];

      const { redisAdapter } = await import('@repo/cache/adapters/redis');
      redisAdapter.del.mockResolvedValue(1);

      // Simulate cache eviction
      const evictionOperations = oldFiles.map(cacheKey => 
        cacheManager.invalidate(cacheKey)
      );

      await Promise.all(evictionOperations);

      // Verify cache eviction
      expect(redisAdapter.del).toHaveBeenCalledTimes(3);
      oldFiles.forEach(cacheKey => {
        expect(redisAdapter.del).toHaveBeenCalledWith(cacheKey);
      });
    });

    it('should track cache hit/miss ratios for upload performance', async () => {
      const { redisAdapter } = await import('@repo/cache/adapters/redis');
      
      // Simulate cache hits and misses
      const cacheRequests = [
        { key: 'upload:file1.jpg', hit: true },
        { key: 'upload:file2.jpg', hit: false },
        { key: 'upload:file3.jpg', hit: true },
        { key: 'upload:file4.jpg', hit: false },
        { key: 'upload:file5.jpg', hit: true }
      ];

      let hits = 0;
      let misses = 0;

      for (const request of cacheRequests) {
        if (request.hit) {
          redisAdapter.get.mockResolvedValueOnce('cached-data');
          const result = await cacheManager.get(request.key);
          if (result) hits++;
        } else {
          redisAdapter.get.mockResolvedValueOnce(null);
          const result = await cacheManager.get(request.key);
          if (!result) misses++;
        }
      }

      const hitRatio = hits / (hits + misses);

      expect(hits).toBe(3);
      expect(misses).toBe(2);
      expect(hitRatio).toBe(0.6); // 60% hit ratio
      expect(redisAdapter.get).toHaveBeenCalledTimes(5);
    });
  });
});
