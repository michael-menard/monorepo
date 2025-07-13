import { vi } from 'vitest';

const mockUser = {
  findUnique: vi.fn(),
  findMany: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
};

vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(() => ({ user: mockUser })),
}));

// Expose mockUser globally for use in tests
(globalThis as any).mockUser = mockUser; 