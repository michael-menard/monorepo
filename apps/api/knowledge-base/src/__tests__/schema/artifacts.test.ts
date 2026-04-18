// artifacts.test.ts
// Write tests for the ArtifactSchema here.

import { expect } from 'vitest';
import { ArtifactSchema } from '../../db/schema/artifacts.js';

const validArtifact = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  storyId: '123e4567-e89b-12d3-a456-426614174000',
  type: 'exampleType',
  data: {},
  createdAt: new Date(),
  updatedAt: new Date(),
};

const invalidArtifact = {
  id: 'invalid-id',
  storyId: 'invalid-id',
  type: '',
  data: null,
  createdAt: 'not-a-date',
  updatedAt: 'not-a-date',
};

describe('ArtifactSchema', () => {
  it('should validate a valid artifact', () => {
    expect(() => ArtifactSchema.parse(validArtifact)).not.toThrow();
  });

  it('should throw an error for an invalid artifact', () => {
    expect(() => ArtifactSchema.parse(invalidArtifact)).toThrow();
  });
});