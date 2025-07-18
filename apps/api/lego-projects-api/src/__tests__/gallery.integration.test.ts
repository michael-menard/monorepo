// NOTE: This test suite is for Jest (not Vitest)
import request from 'supertest';

// In-memory DB and ES data
let images: any[] = [];
let albums: any[] = [];
let flags: any[] = [];

// Mock Drizzle ORM (db) - hoisted mock
jest.mock('../db/client', () => {
  return {
    db: {
      select: jest.fn(() => ({
        from: jest.fn((table: any) => ({
          where: jest.fn((cond: any) => {
            // Check if it's the galleryImages table by looking at the Drizzle symbol
            const tableName = table[Symbol.for('drizzle:Name')] || table[Symbol.for('drizzle:BaseName')];
            
            if (tableName === 'gallery_images') {
              return images;
            }
            if (tableName === 'gallery_albums') {
              return albums;
            }
            if (tableName === 'gallery_flags') {
              return flags;
            }
            return [];
          }),
        })),
      })),
      insert: jest.fn((table: any) => ({
        values: jest.fn((val: any) => ({
          returning: jest.fn(() => {
            const tableName = table[Symbol.for('drizzle:Name')] || table[Symbol.for('drizzle:BaseName')];
            if (tableName === 'gallery_images') {
              images.push(val);
              return [val];
            }
            if (tableName === 'gallery_albums') {
              albums.push(val);
              return [val];
            }
            if (tableName === 'gallery_flags') {
              flags.push(val);
              return [val];
            }
            return [val];
          }),
        })),
      })),
      update: jest.fn((table: any) => ({
        set: jest.fn((val: any) => ({
          where: jest.fn((cond: any) => ({
            returning: jest.fn(() => {
              const tableName = table[Symbol.for('drizzle:Name')] || table[Symbol.for('drizzle:BaseName')];
              if (tableName === 'gallery_images') {
                Object.assign(images[0], val);
                return [images[0]];
              }
              if (tableName === 'gallery_albums') {
                Object.assign(albums[0], val);
                return [albums[0]];
              }
              return [val];
            }),
          })),
        })),
      })),
      delete: jest.fn((table: any) => ({
        where: jest.fn((cond: any) => ({
          returning: jest.fn(() => {
            const tableName = table[Symbol.for('drizzle:Name')] || table[Symbol.for('drizzle:BaseName')];
            if (tableName === 'gallery_images') {
              const removed = images.shift();
              return [removed];
            }
            if (tableName === 'gallery_albums') {
              const removed = albums.shift();
              return [removed];
            }
            if (tableName === 'gallery_flags') {
              const removed = flags.shift();
              return [removed];
            }
            return [{}];
          }),
        })),
      })),
    },
  };
});

// Mock authentication middleware to always set req.user
jest.mock('../middleware/auth', () => ({
  requireAuth: (req: any, res: any, next: any) => {
    req.user = { id: 'user-1', role: 'user' };
    next();
  },
}));

// Mock Elasticsearch utils
jest.mock('../utils/elasticsearch', () => ({
  indexImage: jest.fn(),
  updateImage: jest.fn(),
  deleteImage: jest.fn(),
  indexAlbum: jest.fn(),
  updateAlbum: jest.fn(),
  deleteAlbum: jest.fn(),
  searchGalleryItems: jest.fn(({ type, query, tag, albumId, flagged, from, size }: any) => {
    // Return filtered in-memory data as ES would
    let results: any[] = [];
    if (!type || type === 'all') {
      results = [...albums, ...images.filter((i: any) => !i.albumId)];
    } else if (type === 'album') {
      results = [...albums];
    } else if (type === 'image') {
      results = images.filter((i: any) => !i.albumId);
    }
    if (tag) results = results.filter((i: any) => Array.isArray(i.tags) && i.tags.includes(tag));
    if (albumId) results = results.filter((i: any) => i.albumId === albumId);
    if (flagged !== undefined) results = results.filter((i: any) => i.flagged === flagged);
    if (query) results = results.filter((i: any) =>
      (i.title && i.title.includes(query)) ||
      (i.description && i.description.includes(query)) ||
      (Array.isArray(i.tags) && i.tags.some((t: string) => t.includes(query)))
    );
    return results.slice(from || 0, (from || 0) + (size || 20));
  }),
}));

// Mock file storage (no-op)
jest.mock('../storage', () => ({
  galleryUpload: { single: () => (req: any, res: any, next: any) => next() },
  avatarUpload: { single: () => (req: any, res: any, next: any) => next() },
}));

// Import app after mocks
import app from '../../index';

// --- Test Data ---
const testAlbum: any = { id: 'album-1', userId: 'user-1', title: 'My Album', description: 'Desc', coverImageId: null, createdAt: new Date(), lastUpdatedAt: new Date(), type: 'album' };
const testImage: any = { id: 'img-1', userId: 'user-1', title: 'My Image', description: 'Desc', tags: ['lego'], imageUrl: '/img.jpg', albumId: null, flagged: false, createdAt: new Date(), lastUpdatedAt: new Date(), type: 'image' };
const testImageInAlbum: any = { ...testImage, id: 'img-2', albumId: 'album-1' };

// --- Test Suite ---
describe('/api/gallery integration (fully mocked, Jest)', () => {
  beforeEach(() => {
    // Clear arrays
    images.length = 0;
    albums.length = 0;
    flags.length = 0;
    
    // Add test data
    images.push({ ...testImage }, { ...testImageInAlbum });
    albums.push({ ...testAlbum });
  });

  it('returns unified list of albums and images', async () => {
    const res = await request(app)
      .get('/api/gallery')
      .set('Cookie', 'token=test-user-token');
    
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(res.body.items.some((i: any) => i.type === 'album')).toBe(true);
    expect(res.body.items.some((i: any) => i.type === 'image')).toBe(true);
  });

  it('filters by type=album', async () => {
    const res = await request(app)
      .get('/api/gallery?type=album')
      .set('Cookie', 'token=test-user-token');
    expect(res.status).toBe(200);
    expect(res.body.items.every((i: any) => i.type === 'album')).toBe(true);
  });

  it('filters by type=image', async () => {
    const res = await request(app)
      .get('/api/gallery?type=image')
      .set('Cookie', 'token=test-user-token');
    expect(res.status).toBe(200);
    expect(res.body.items.every((i: any) => i.type === 'image')).toBe(true);
  });

  it('filters by tag', async () => {
    const res = await request(app)
      .get('/api/gallery?tag=lego')
      .set('Cookie', 'token=test-user-token');
    
    expect(res.status).toBe(200);
    expect(res.body.items.some((i: any) => Array.isArray(i.tags) && i.tags.includes('lego'))).toBe(true);
  });

  it('supports pagination', async () => {
    const res1 = await request(app)
      .get('/api/gallery?limit=1')
      .set('Cookie', 'token=test-user-token');
    expect(res1.status).toBe(200);
    expect(res1.body.items.length).toBeLessThanOrEqual(1);
  });

  it('does not show images inside albums as standalone', async () => {
    const res = await request(app)
      .get('/api/gallery?type=image')
      .set('Cookie', 'token=test-user-token');
    expect(res.status).toBe(200);
    expect(res.body.items.every((i: any) => i.albumId == null)).toBe(true);
  });

  it('supports search (if ES is running)', async () => {
    const res = await request(app)
      .get('/api/gallery?search=My')
      .set('Cookie', 'token=test-user-token');
    expect(res.status).toBe(200);
    expect(res.body.items.length).toBeGreaterThanOrEqual(1);
  });
}); 