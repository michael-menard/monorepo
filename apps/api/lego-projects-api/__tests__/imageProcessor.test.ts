import { 
  getOptimalFormat, 
  canProcessImage, 
  DEFAULT_AVATAR_CONFIG,
  HIGH_QUALITY_CONFIG,
  THUMBNAIL_CONFIG,
  ImageProcessingConfig
} from '../src/utils/imageProcessor';

// Mock Sharp to avoid actual image processing in tests
jest.mock('sharp', () => {
  const mockSharp = jest.fn(() => {
    const mockInstance: any = {};
    mockInstance.metadata = jest.fn().mockResolvedValue({ width: 1920, height: 1080 });
    mockInstance.resize = jest.fn().mockReturnValue(mockInstance);
    mockInstance.jpeg = jest.fn().mockReturnValue(mockInstance);
    mockInstance.png = jest.fn().mockReturnValue(mockInstance);
    mockInstance.webp = jest.fn().mockReturnValue(mockInstance);
    mockInstance.rotate = jest.fn().mockReturnValue(mockInstance);
    mockInstance.sharpen = jest.fn().mockReturnValue(mockInstance);
    mockInstance.toBuffer = jest.fn().mockResolvedValue(Buffer.from('processed-image-data'));
    return mockInstance;
  });
  
  return mockSharp;
});

describe('Image Processor', () => {
  describe('getOptimalFormat', () => {
    it('should return webp for webp files', () => {
      expect(getOptimalFormat('image.webp', 'image/webp')).toBe('webp');
    });

    it('should return png for png files', () => {
      expect(getOptimalFormat('image.png', 'image/png')).toBe('png');
    });

    it('should return jpeg for jpg files', () => {
      expect(getOptimalFormat('image.jpg', 'image/jpeg')).toBe('jpeg');
    });

    it('should return jpeg for jpeg files', () => {
      expect(getOptimalFormat('image.jpeg', 'image/jpeg')).toBe('jpeg');
    });

    it('should default to jpeg for unknown formats', () => {
      expect(getOptimalFormat('image.unknown', 'image/unknown')).toBe('jpeg');
    });
  });

  describe('canProcessImage', () => {
    it('should return true for supported image types', () => {
      expect(canProcessImage('image/jpeg')).toBe(true);
      expect(canProcessImage('image/jpg')).toBe(true);
      expect(canProcessImage('image/png')).toBe(true);
      expect(canProcessImage('image/webp')).toBe(true);
      expect(canProcessImage('image/heic')).toBe(true);
    });

    it('should return false for unsupported image types', () => {
      expect(canProcessImage('image/gif')).toBe(false);
      expect(canProcessImage('image/bmp')).toBe(false);
      expect(canProcessImage('text/plain')).toBe(false);
    });
  });

  describe('Configuration constants', () => {
    it('should have correct default avatar configuration', () => {
      expect(DEFAULT_AVATAR_CONFIG).toEqual({
        maxWidth: 800,
        maxHeight: 800,
        quality: 85,
        format: 'jpeg',
        fit: 'cover'
      });
    });

    it('should have correct high quality configuration', () => {
      expect(HIGH_QUALITY_CONFIG).toEqual({
        maxWidth: 1200,
        maxHeight: 1200,
        quality: 90,
        format: 'jpeg',
        fit: 'inside'
      });
    });

    it('should have correct thumbnail configuration', () => {
      expect(THUMBNAIL_CONFIG).toEqual({
        maxWidth: 200,
        maxHeight: 200,
        quality: 80,
        format: 'jpeg',
        fit: 'cover'
      });
    });
  });
}); 