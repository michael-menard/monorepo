const { createDefaultPreset } = require('ts-jest');

const tsJestTransformCfg = createDefaultPreset().transform;

/** @type {import("jest").Config} **/
module.exports = {
  testEnvironment: 'node',
  transform: {
    ...tsJestTransformCfg,
  },
  testPathIgnorePatterns: ['<rootDir>/dist/'],
  moduleNameMapper: {
    // Map db/client import to the actual TypeScript file
    '^../db/client$': '<rootDir>/src/db/client.ts',
    // Map storage import to the actual TypeScript file
    '^../storage$': '<rootDir>/src/storage/index.ts',
    // Map middleware import to the actual TypeScript file
    '^../src/middleware/auth$': '<rootDir>/src/middleware/auth.ts',
  },
};
