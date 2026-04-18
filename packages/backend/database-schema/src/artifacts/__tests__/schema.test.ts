// Write your tests here
// Example:

import { artifacts, ArtifactsSchema } from '../schema';
import { expectTypeOf } from 'expect-type';

it('should define the schema correctly', () => {
  expectTypeOf(artifacts).toHaveProperty('id');
  expectTypeOf(artifacts).toHaveProperty('name');
  expectTypeOf(artifacts).toHaveProperty('type');
  expectTypeOf(artifacts).toHaveProperty('createdAt');
});

it('should validate the schema correctly', () => {
  const validArtifact = {
    id: '123',
    name: 'Sample Artifact',
    type: 'type1',
    createdAt: Date.now(),
  };

  expect(() => ArtifactsSchema.parse(validArtifact)).not.toThrow();
});