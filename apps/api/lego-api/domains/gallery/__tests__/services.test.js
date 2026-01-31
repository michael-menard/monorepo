import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createGalleryService } from '../application/services.js';
/**
 * Gallery Service Unit Tests
 *
 * Tests business logic using mock repositories/storage.
 * No real database or S3 calls.
 */
// Mock implementations
const mockImage = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    userId: 'user-123',
    title: 'Test Image',
    description: 'A test image',
    tags: ['test', 'mock'],
    imageUrl: 'https://bucket.s3.amazonaws.com/images/user-123/123e4567.webp',
    thumbnailUrl: 'https://bucket.s3.amazonaws.com/images/user-123/thumbnails/123e4567.webp',
    albumId: null,
    flagged: false,
    createdAt: new Date(),
    lastUpdatedAt: new Date(),
};
const mockAlbum = {
    id: 'album-123',
    userId: 'user-123',
    title: 'Test Album',
    description: 'A test album',
    coverImageId: null,
    imageCount: 0,
    createdAt: new Date(),
    lastUpdatedAt: new Date(),
};
function createMockImageRepo() {
    return {
        findById: vi.fn().mockResolvedValue({ ok: true, data: mockImage }),
        findByUserId: vi.fn().mockResolvedValue({
            items: [mockImage],
            pagination: { page: 1, limit: 20, total: 1, totalPages: 1, hasMore: false },
        }),
        insert: vi.fn().mockResolvedValue(mockImage),
        update: vi.fn().mockResolvedValue({ ok: true, data: mockImage }),
        delete: vi.fn().mockResolvedValue({ ok: true, data: undefined }),
        orphanByAlbumId: vi.fn().mockResolvedValue(undefined),
    };
}
function createMockAlbumRepo() {
    return {
        findById: vi.fn().mockResolvedValue({ ok: true, data: mockAlbum }),
        findByUserId: vi.fn().mockResolvedValue({
            items: [mockAlbum],
            pagination: { page: 1, limit: 20, total: 1, totalPages: 1, hasMore: false },
        }),
        insert: vi.fn().mockResolvedValue(mockAlbum),
        update: vi.fn().mockResolvedValue({ ok: true, data: mockAlbum }),
        delete: vi.fn().mockResolvedValue({ ok: true, data: undefined }),
    };
}
function createMockStorage() {
    return {
        upload: vi.fn().mockResolvedValue({ ok: true, data: { url: 'https://bucket.s3.amazonaws.com/test.webp' } }),
        delete: vi.fn().mockResolvedValue({ ok: true, data: undefined }),
        extractKeyFromUrl: vi.fn().mockReturnValue('images/user-123/test.webp'),
    };
}
describe('GalleryService', () => {
    let imageRepo;
    let albumRepo;
    let imageStorage;
    let service;
    beforeEach(() => {
        imageRepo = createMockImageRepo();
        albumRepo = createMockAlbumRepo();
        imageStorage = createMockStorage();
        service = createGalleryService({ imageRepo, albumRepo, imageStorage });
    });
    describe('getImage', () => {
        it('returns image when user owns it', async () => {
            const result = await service.getImage('user-123', mockImage.id);
            expect(result.ok).toBe(true);
            if (result.ok) {
                expect(result.data.id).toBe(mockImage.id);
            }
        });
        it('returns FORBIDDEN when user does not own image', async () => {
            const result = await service.getImage('other-user', mockImage.id);
            expect(result.ok).toBe(false);
            if (!result.ok) {
                expect(result.error).toBe('FORBIDDEN');
            }
        });
        it('returns NOT_FOUND when image does not exist', async () => {
            vi.mocked(imageRepo.findById).mockResolvedValue({ ok: false, error: 'NOT_FOUND' });
            const result = await service.getImage('user-123', 'nonexistent');
            expect(result.ok).toBe(false);
            if (!result.ok) {
                expect(result.error).toBe('NOT_FOUND');
            }
        });
    });
    describe('listImages', () => {
        it('returns paginated images for user', async () => {
            const result = await service.listImages('user-123', { page: 1, limit: 20 });
            expect(result.items).toHaveLength(1);
            expect(result.pagination.total).toBe(1);
            expect(imageRepo.findByUserId).toHaveBeenCalledWith('user-123', { page: 1, limit: 20 }, undefined);
        });
        it('passes filters to repository', async () => {
            await service.listImages('user-123', { page: 1, limit: 20 }, { albumId: 'album-1', search: 'test' });
            expect(imageRepo.findByUserId).toHaveBeenCalledWith('user-123', { page: 1, limit: 20 }, { search: 'test', albumId: 'album-1' });
        });
    });
    describe('uploadImage', () => {
        it('uploads image and saves to database', async () => {
            const file = {
                buffer: Buffer.from('test'),
                filename: 'test.jpg',
                mimetype: 'image/jpeg',
                size: 1000,
            };
            const result = await service.uploadImage('user-123', file, { title: 'New Image' });
            expect(result.ok).toBe(true);
            expect(imageStorage.upload).toHaveBeenCalled();
            expect(imageRepo.insert).toHaveBeenCalled();
        });
        it('rejects invalid file types', async () => {
            const file = {
                buffer: Buffer.from('test'),
                filename: 'test.exe',
                mimetype: 'application/x-msdownload',
                size: 1000,
            };
            const result = await service.uploadImage('user-123', file, { title: 'Bad File' });
            expect(result.ok).toBe(false);
            if (!result.ok) {
                expect(result.error).toBe('INVALID_FILE');
            }
        });
        it('rejects files over size limit', async () => {
            const file = {
                buffer: Buffer.from('test'),
                filename: 'big.jpg',
                mimetype: 'image/jpeg',
                size: 20 * 1024 * 1024, // 20MB
            };
            const result = await service.uploadImage('user-123', file, { title: 'Too Big' });
            expect(result.ok).toBe(false);
            if (!result.ok) {
                expect(result.error).toBe('INVALID_FILE');
            }
        });
    });
    describe('deleteImage', () => {
        it('deletes image and S3 files when user owns it', async () => {
            const result = await service.deleteImage('user-123', mockImage.id);
            expect(result.ok).toBe(true);
            expect(imageStorage.delete).toHaveBeenCalled();
            expect(imageRepo.delete).toHaveBeenCalledWith(mockImage.id);
        });
        it('returns FORBIDDEN when user does not own image', async () => {
            const result = await service.deleteImage('other-user', mockImage.id);
            expect(result.ok).toBe(false);
            if (!result.ok) {
                expect(result.error).toBe('FORBIDDEN');
            }
            expect(imageRepo.delete).not.toHaveBeenCalled();
        });
    });
    describe('createAlbum', () => {
        it('creates album for user', async () => {
            const result = await service.createAlbum('user-123', { title: 'New Album' });
            expect(result.ok).toBe(true);
            expect(albumRepo.insert).toHaveBeenCalled();
        });
        it('validates cover image ownership', async () => {
            // Cover image belongs to different user
            vi.mocked(imageRepo.findById).mockResolvedValue({
                ok: true,
                data: { ...mockImage, userId: 'other-user' },
            });
            const result = await service.createAlbum('user-123', {
                title: 'New Album',
                coverImageId: mockImage.id,
            });
            expect(result.ok).toBe(false);
            if (!result.ok) {
                expect(result.error).toBe('FORBIDDEN');
            }
        });
    });
    describe('deleteAlbum', () => {
        it('orphans images before deleting album', async () => {
            const result = await service.deleteAlbum('user-123', mockAlbum.id);
            expect(result.ok).toBe(true);
            expect(imageRepo.orphanByAlbumId).toHaveBeenCalledWith(mockAlbum.id);
            expect(albumRepo.delete).toHaveBeenCalledWith(mockAlbum.id);
        });
        it('returns FORBIDDEN when user does not own album', async () => {
            vi.mocked(albumRepo.findById).mockResolvedValue({
                ok: true,
                data: { ...mockAlbum, userId: 'other-user' },
            });
            const result = await service.deleteAlbum('user-123', mockAlbum.id);
            expect(result.ok).toBe(false);
            if (!result.ok) {
                expect(result.error).toBe('FORBIDDEN');
            }
            expect(albumRepo.delete).not.toHaveBeenCalled();
        });
    });
});
