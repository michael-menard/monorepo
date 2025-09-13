import { describe, it, expect } from 'vitest';
import {
  imageAdapter,
  inspirationAdapter,
  instructionAdapter,
  wishlistAdapter,
  createAdapter,
} from '../adapters';

describe('Data Adapters', () => {
  describe('imageAdapter', () => {
    const mockImageData = {
      id: '1',
      url: 'https://example.com/image.jpg',
      title: 'Test Image',
      description: 'Test description',
      author: 'Test Author',
      tags: ['tag1', 'tag2'],
      createdAt: '2023-01-01T00:00:00Z',
      category: 'test',
      thumbnailUrl: 'https://example.com/thumb.jpg',
    };

    it('transforms image data correctly', () => {
      const result = imageAdapter.transform(mockImageData);

      expect(result).toEqual({
        id: '1',
        title: 'Test Image',
        description: 'Test description',
        imageUrl: 'https://example.com/image.jpg',
        thumbnailUrl: 'https://example.com/thumb.jpg',
        author: 'Test Author',
        tags: ['tag1', 'tag2'],
        category: 'test',
        createdAt: new Date('2023-01-01T00:00:00Z'),
        updatedAt: undefined,
        type: 'image',
        originalData: mockImageData,
        metadata: expect.objectContaining({
          category: 'test',
          thumbnailUrl: 'https://example.com/thumb.jpg',
        }),
      });
    });

    it('handles Date objects for createdAt', () => {
      const dataWithDate = {
        ...mockImageData,
        createdAt: new Date('2023-01-01'),
      };

      const result = imageAdapter.transform(dataWithDate);
      expect(result.createdAt).toBeInstanceOf(Date);
    });

    it('validates data correctly', () => {
      expect(imageAdapter.validate!(mockImageData)).toBe(true);
      expect(imageAdapter.validate!({ id: '1' })).toBe(false);
      expect(imageAdapter.validate!(null)).toBe(false);
    });

    it('generates searchable text', () => {
      const searchText = imageAdapter.getSearchableText!(mockImageData);
      expect(searchText).toBe('Test Image Test description Test Author tag1 tag2');
    });

    it('handles missing optional fields', () => {
      const minimalData = {
        id: '1',
        url: 'https://example.com/image.jpg',
        createdAt: '2023-01-01T00:00:00Z',
      };

      const result = imageAdapter.transform(minimalData);
      expect(result.title).toBeUndefined();
      expect(result.description).toBeUndefined();
      expect(result.author).toBeUndefined();
      expect(result.tags).toBeUndefined();
    });
  });

  describe('inspirationAdapter', () => {
    const mockInspirationData = {
      id: '1',
      title: 'Amazing Build',
      imageUrl: 'https://example.com/build.jpg',
      description: 'An amazing LEGO build',
      author: 'Builder123',
      tags: ['space', 'moc'],
      createdAt: '2023-01-01T00:00:00Z',
      liked: true,
      likes: 42,
      views: 1000,
      difficulty: 'intermediate',
    };

    it('transforms inspiration data correctly', () => {
      const result = inspirationAdapter.transform(mockInspirationData);

      expect(result).toEqual({
        id: '1',
        title: 'Amazing Build',
        description: 'An amazing LEGO build',
        imageUrl: 'https://example.com/build.jpg',
        thumbnailUrl: undefined,
        author: 'Builder123',
        tags: ['space', 'moc'],
        category: 'inspiration',
        createdAt: new Date('2023-01-01T00:00:00Z'),
        updatedAt: undefined,
        liked: true,
        type: 'inspiration',
        originalData: mockInspirationData,
        metadata: {
          likes: 42,
          views: 1000,
          difficulty: 'intermediate',
          buildTime: undefined,
        },
      });
    });

    it('validates inspiration data correctly', () => {
      expect(inspirationAdapter.validate!(mockInspirationData)).toBe(true);
      expect(inspirationAdapter.validate!({ id: '1', imageUrl: 'test.jpg' })).toBe(false);
    });
  });

  describe('instructionAdapter', () => {
    const mockInstructionData = {
      id: '1',
      title: 'MOC Instructions',
      description: 'Step-by-step instructions',
      author: 'Designer',
      tags: ['moc', 'instructions'],
      difficulty: 'advanced',
      pieceCount: 500,
      createdAt: '2023-01-01T00:00:00Z',
      imageUrl: 'https://example.com/instruction.jpg',
      buildTime: '2 hours',
      steps: 25,
    };

    it('transforms instruction data correctly', () => {
      const result = instructionAdapter.transform(mockInstructionData);

      expect(result).toEqual({
        id: '1',
        title: 'MOC Instructions',
        description: 'Step-by-step instructions',
        imageUrl: 'https://example.com/instruction.jpg',
        thumbnailUrl: undefined,
        author: 'Designer',
        tags: ['moc', 'instructions'],
        category: 'instruction',
        createdAt: new Date('2023-01-01T00:00:00Z'),
        updatedAt: undefined,
        type: 'instruction',
        originalData: mockInstructionData,
        metadata: {
          difficulty: 'advanced',
          pieceCount: 500,
          buildTime: '2 hours',
          steps: 25,
          downloadCount: undefined,
        },
      });
    });

    it('uses placeholder image when no imageUrl provided', () => {
      const dataWithoutImage = { ...mockInstructionData };
      delete dataWithoutImage.imageUrl;

      const result = instructionAdapter.transform(dataWithoutImage);
      expect(result.imageUrl).toBe('/placeholder-instruction.jpg');
    });

    it('validates instruction data correctly', () => {
      expect(instructionAdapter.validate!(mockInstructionData)).toBe(true);
      expect(instructionAdapter.validate!({ id: '1' })).toBe(false);
    });
  });

  describe('wishlistAdapter', () => {
    const mockWishlistData = {
      id: '1',
      name: 'LEGO Set 12345',
      description: 'Amazing set',
      imageUrl: 'https://example.com/set.jpg',
      price: 99.99,
      priority: 'high',
      purchased: false,
      category: 'sets',
      tags: ['wishlist', 'sets'],
      createdAt: '2023-01-01T00:00:00Z',
      brand: 'LEGO',
      model: '12345',
    };

    it('transforms wishlist data correctly', () => {
      const result = wishlistAdapter.transform(mockWishlistData);

      expect(result).toEqual({
        id: '1',
        title: 'LEGO Set 12345',
        description: 'Amazing set',
        imageUrl: 'https://example.com/set.jpg',
        thumbnailUrl: undefined,
        author: 'LEGO',
        tags: ['wishlist', 'sets'],
        category: 'sets',
        createdAt: new Date('2023-01-01T00:00:00Z'),
        updatedAt: undefined,
        type: 'wishlist',
        originalData: mockWishlistData,
        metadata: {
          price: 99.99,
          priority: 'high',
          purchased: false,
          brand: 'LEGO',
          model: '12345',
          availability: undefined,
        },
      });
    });

    it('uses placeholder image when no imageUrl provided', () => {
      const dataWithoutImage = { ...mockWishlistData };
      delete dataWithoutImage.imageUrl;

      const result = wishlistAdapter.transform(dataWithoutImage);
      expect(result.imageUrl).toBe('/placeholder-wishlist.jpg');
    });

    it('validates wishlist data correctly', () => {
      expect(wishlistAdapter.validate!(mockWishlistData)).toBe(true);
      expect(wishlistAdapter.validate!({ id: '1' })).toBe(false);
    });
  });

  describe('createAdapter', () => {
    const customData = {
      uuid: 'custom-1',
      name: 'Custom Item',
      photo: 'https://example.com/custom.jpg',
      info: 'Custom description',
      creator: 'Custom Author',
      keywords: ['custom', 'test'],
      type: 'custom',
      timestamp: new Date('2023-01-01'),
      extra1: 'value1',
      extra2: 'value2',
    };

    const customAdapter = createAdapter({
      idField: 'uuid',
      titleField: 'name',
      imageField: 'photo',
      descriptionField: 'info',
      authorField: 'creator',
      tagsField: 'keywords',
      categoryField: 'type',
      createdAtField: 'timestamp',
      type: 'custom',
      searchFields: ['name', 'info', 'creator'],
      metadataFields: ['extra1', 'extra2'],
    });

    it('creates custom adapter correctly', () => {
      const result = customAdapter.transform(customData);

      expect(result).toEqual({
        id: 'custom-1',
        title: 'Custom Item',
        description: 'Custom description',
        imageUrl: 'https://example.com/custom.jpg',
        author: 'Custom Author',
        tags: ['custom', 'test'],
        category: 'custom',
        createdAt: new Date('2023-01-01'),
        type: 'custom',
        originalData: customData,
        metadata: {
          extra1: 'value1',
          extra2: 'value2',
        },
      });
    });

    it('validates custom data correctly', () => {
      expect(customAdapter.validate(customData)).toBe(true);
      expect(customAdapter.validate({ uuid: '1' })).toBe(false);
    });

    it('generates searchable text from custom fields', () => {
      const searchText = customAdapter.getSearchableText!(customData);
      expect(searchText).toBe('Custom Item Custom description Custom Author');
    });

    it('handles array fields in search', () => {
      const adapterWithArraySearch = createAdapter({
        idField: 'uuid',
        titleField: 'name',
        imageField: 'photo',
        searchFields: ['name', 'keywords'],
      });

      const searchText = adapterWithArraySearch.getSearchableText!(customData);
      expect(searchText).toBe('Custom Item custom test');
    });

    it('uses current date when no createdAtField specified', () => {
      const adapterWithoutDate = createAdapter({
        idField: 'uuid',
        titleField: 'name',
        imageField: 'photo',
      });

      const result = adapterWithoutDate.transform(customData);
      expect(result.createdAt).toBeInstanceOf(Date);
    });
  });
});
