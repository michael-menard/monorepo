import { describe, it, expect } from 'vitest';
import {
  inspirationGalleryPreset,
  instructionsGalleryPreset,
  wishlistGalleryPreset,
  compactGalleryPreset,
  tableGalleryPreset,
  carouselGalleryPreset,
  getPreset,
  mergePresetConfig,
} from '../index';

describe('Gallery Presets', () => {
  describe('inspirationGalleryPreset', () => {
    it('has correct configuration for inspiration gallery', () => {
      expect(inspirationGalleryPreset.name).toBe('inspiration');
      expect(inspirationGalleryPreset.config.layout).toBe('masonry');
      expect(inspirationGalleryPreset.config.viewMode).toBe('comfortable');
      expect(inspirationGalleryPreset.config.selectable).toBe(false);
      expect(inspirationGalleryPreset.config.infiniteScroll).toBe(true);
      expect(inspirationGalleryPreset.adapter).toBeDefined();
    });

    it('has appropriate sort options for inspiration', () => {
      const sortOptions = inspirationGalleryPreset.config.sortOptions;
      expect(sortOptions).toHaveLength(4);
      expect(sortOptions[0]).toEqual({
        field: 'createdAt',
        direction: 'desc',
        label: 'Newest First',
      });
      expect(sortOptions.some(opt => opt.field === 'liked')).toBe(true);
    });

    it('has custom filters for difficulty', () => {
      const customFilters = inspirationGalleryPreset.config.filterConfig.customFilters;
      expect(customFilters).toHaveLength(1);
      expect(customFilters[0].key).toBe('difficulty');
      expect(customFilters[0].type).toBe('select');
      expect(customFilters[0].options).toHaveLength(4);
    });
  });

  describe('instructionsGalleryPreset', () => {
    it('has correct configuration for instructions gallery', () => {
      expect(instructionsGalleryPreset.name).toBe('instructions');
      expect(instructionsGalleryPreset.config.layout).toBe('grid');
      expect(instructionsGalleryPreset.config.selectable).toBe(true);
      expect(instructionsGalleryPreset.config.multiSelect).toBe(true);
      expect(instructionsGalleryPreset.config.itemsPerPage).toBe(24);
    });

    it('has appropriate sort options for instructions', () => {
      const sortOptions = instructionsGalleryPreset.config.sortOptions;
      expect(sortOptions.some(opt => opt.field === 'difficulty')).toBe(true);
      expect(sortOptions.some(opt => opt.field === 'pieceCount')).toBe(true);
      expect(sortOptions.some(opt => opt.field === 'downloadCount')).toBe(true);
    });

    it('has multiselect filters', () => {
      const customFilters = instructionsGalleryPreset.config.filterConfig.customFilters;
      const difficultyFilter = customFilters.find(f => f.key === 'difficulty');
      expect(difficultyFilter?.type).toBe('multiselect');
    });
  });

  describe('wishlistGalleryPreset', () => {
    it('has correct configuration for wishlist gallery', () => {
      expect(wishlistGalleryPreset.name).toBe('wishlist');
      expect(wishlistGalleryPreset.config.layout).toBe('grid');
      expect(wishlistGalleryPreset.config.draggable).toBe(true);
      expect(wishlistGalleryPreset.config.infiniteScroll).toBe(false);
    });

    it('has priority-focused sort options', () => {
      const sortOptions = wishlistGalleryPreset.config.sortOptions;
      expect(sortOptions[0].field).toBe('priority');
      expect(sortOptions[0].direction).toBe('desc');
      expect(sortOptions.some(opt => opt.field === 'price')).toBe(true);
    });

    it('has purchase status filter', () => {
      const customFilters = wishlistGalleryPreset.config.filterConfig.customFilters;
      const statusFilter = customFilters.find(f => f.key === 'purchased');
      expect(statusFilter).toBeDefined();
      expect(statusFilter?.options).toContainEqual({
        value: 'purchased',
        label: 'Purchased',
      });
    });
  });

  describe('compactGalleryPreset', () => {
    it('has correct configuration for compact spaces', () => {
      expect(compactGalleryPreset.name).toBe('compact');
      expect(compactGalleryPreset.config.layout).toBe('list');
      expect(compactGalleryPreset.config.viewMode).toBe('compact');
      expect(compactGalleryPreset.config.itemsPerPage).toBe(10);
      expect(compactGalleryPreset.config.sortable).toBe(false);
      expect(compactGalleryPreset.config.animations.enabled).toBe(false);
    });

    it('has minimal filter configuration', () => {
      const filterConfig = compactGalleryPreset.config.filterConfig;
      expect(filterConfig.tagFilter).toBe(false);
      expect(filterConfig.categoryFilter).toBe(false);
      expect(filterConfig.customFilters).toHaveLength(0);
    });
  });

  describe('tableGalleryPreset', () => {
    it('has correct configuration for data management', () => {
      expect(tableGalleryPreset.name).toBe('table');
      expect(tableGalleryPreset.config.layout).toBe('table');
      expect(tableGalleryPreset.config.viewMode).toBe('compact');
      expect(tableGalleryPreset.config.itemsPerPage).toBe(50);
      expect(tableGalleryPreset.config.infiniteScroll).toBe(false);
      expect(tableGalleryPreset.config.animations.enabled).toBe(false);
    });

    it('has data-focused sort options', () => {
      const sortOptions = tableGalleryPreset.config.sortOptions;
      expect(sortOptions.some(opt => opt.field === 'updatedAt')).toBe(true);
      expect(sortOptions.some(opt => opt.field === 'author')).toBe(true);
    });
  });

  describe('carouselGalleryPreset', () => {
    it('has correct configuration for featured content', () => {
      expect(carouselGalleryPreset.name).toBe('carousel');
      expect(carouselGalleryPreset.config.layout).toBe('carousel');
      expect(carouselGalleryPreset.config.viewMode).toBe('spacious');
      expect(carouselGalleryPreset.config.itemsPerPage).toBe(5);
      expect(carouselGalleryPreset.config.selectable).toBe(false);
      expect(carouselGalleryPreset.config.sortable).toBe(false);
    });

    it('has no filters for carousel', () => {
      const filterConfig = carouselGalleryPreset.config.filterConfig;
      expect(filterConfig.searchable).toBe(false);
      expect(filterConfig.tagFilter).toBe(false);
      expect(filterConfig.categoryFilter).toBe(false);
    });

    it('has smooth animations', () => {
      const animations = carouselGalleryPreset.config.animations;
      expect(animations.enabled).toBe(true);
      expect(animations.duration).toBe(0.6);
      expect(animations.stagger).toBe(false);
    });
  });

  describe('getPreset', () => {
    it('returns correct preset by name', () => {
      expect(getPreset('inspiration')).toBe(inspirationGalleryPreset);
      expect(getPreset('instructions')).toBe(instructionsGalleryPreset);
      expect(getPreset('wishlist')).toBe(wishlistGalleryPreset);
      expect(getPreset('compact')).toBe(compactGalleryPreset);
      expect(getPreset('table')).toBe(tableGalleryPreset);
      expect(getPreset('carousel')).toBe(carouselGalleryPreset);
    });

    it('returns undefined for unknown preset', () => {
      expect(getPreset('unknown')).toBeUndefined();
    });
  });

  describe('mergePresetConfig', () => {
    it('merges preset config with custom config', () => {
      const customConfig = {
        itemsPerPage: 30,
        selectable: true,
        filterConfig: {
          searchable: false,
          tagFilter: false,
        },
      };

      const merged = mergePresetConfig(inspirationGalleryPreset, customConfig);

      expect(merged.layout).toBe('masonry'); // From preset
      expect(merged.itemsPerPage).toBe(30); // From custom
      expect(merged.selectable).toBe(true); // From custom
      expect(merged.filterConfig.searchable).toBe(false); // From custom
      expect(merged.filterConfig.categoryFilter).toBe(false); // From preset
    });

    it('deeply merges nested objects', () => {
      const customConfig = {
        columns: {
          lg: 6,
          xl: 8,
        },
        animations: {
          duration: 0.5,
        },
      };

      const merged = mergePresetConfig(inspirationGalleryPreset, customConfig);

      expect(merged.columns.xs).toBe(1); // From preset
      expect(merged.columns.lg).toBe(6); // From custom
      expect(merged.columns.xl).toBe(8); // From custom
      expect(merged.animations.enabled).toBe(true); // From preset
      expect(merged.animations.duration).toBe(0.5); // From custom
    });

    it('handles empty custom config', () => {
      const merged = mergePresetConfig(inspirationGalleryPreset);
      expect(merged).toEqual(inspirationGalleryPreset.config);
    });

    it('handles undefined custom config', () => {
      const merged = mergePresetConfig(inspirationGalleryPreset, undefined);
      expect(merged).toEqual(inspirationGalleryPreset.config);
    });
  });

  describe('Preset Validation', () => {
    const presets = [
      inspirationGalleryPreset,
      instructionsGalleryPreset,
      wishlistGalleryPreset,
      compactGalleryPreset,
      tableGalleryPreset,
      carouselGalleryPreset,
    ];

    it('all presets have required properties', () => {
      presets.forEach(preset => {
        expect(preset.name).toBeDefined();
        expect(preset.description).toBeDefined();
        expect(preset.config).toBeDefined();
        expect(preset.config.layout).toBeDefined();
        expect(preset.config.viewMode).toBeDefined();
      });
    });

    it('all presets have valid layout values', () => {
      const validLayouts = ['grid', 'masonry', 'list', 'table', 'carousel'];
      presets.forEach(preset => {
        expect(validLayouts).toContain(preset.config.layout);
      });
    });

    it('all presets have valid view mode values', () => {
      const validViewModes = ['compact', 'comfortable', 'spacious'];
      presets.forEach(preset => {
        expect(validViewModes).toContain(preset.config.viewMode);
      });
    });

    it('all presets have reasonable itemsPerPage values', () => {
      presets.forEach(preset => {
        expect(preset.config.itemsPerPage).toBeGreaterThan(0);
        expect(preset.config.itemsPerPage).toBeLessThanOrEqual(100);
      });
    });
  });
});
