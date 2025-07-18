// Mock the db module before importing handlers
// NOTE: For TypeScript, Jest usually resolves modules without the .ts extension
jest.mock('../db/client', () => ({
  db: {
    select: jest.fn(() => ({
      from: jest.fn(() => ({
        where: jest.fn(() => [
          { id: '123', username: 'sampleuser', email: 'sample@example.com', preferredName: 'Sample', avatar: 'https://example.com/avatar.jpg' }
        ])
      }))
    })),
    insert: jest.fn(() => ({
      values: jest.fn(() => ({
        returning: jest.fn(() => [
          { id: '123', username: 'testuser', email: 'test@example.com', preferredName: 'Testy', avatar: '/uploads/avatar.jpg' }
        ])
      }))
    }))
  }
}));
// Mock saveAvatar to always return a predictable value
jest.mock('../../storage', () => ({
  saveAvatar: jest.fn(() => Promise.resolve('/uploads/avatar.jpg')),
}));
import { getProfile, createProfile } from '../profile';
import type { Request, Response } from 'express';
import { db } from '../../db/client';

function mockResponse() {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnThis();
  res.json = jest.fn().mockReturnThis();
  return res as Response;
}

describe('profile controller', () => {
  describe('getProfile', () => {
    it('should return a sample user profile', async () => {
      const req = { params: { id: '123' } } as unknown as Request;
      const res = mockResponse();
      await getProfile(req, res);
      expect(res.json).toHaveBeenCalledWith({
        id: '123',
        username: 'sampleuser',
        email: 'sample@example.com',
        preferredName: 'Sample',
        avatar: 'https://example.com/avatar.jpg',
      });
    });
  });

  describe('createProfile', () => {
    let req: Partial<Request>;
    let res: Response;

    beforeEach(() => {
      req = { params: { id: '123' }, body: { username: 'testuser', email: 'test@example.com', preferredName: 'Testy' } };
      res = mockResponse();
    });

    it('should return 400 if no file is uploaded', async () => {
      await createProfile(req as Request, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Avatar file is required' });
    });

    it('should return 201 and profile data if file is uploaded', async () => {
      // Override the select().from().where() mock to return [] for this test
      const selectMock = jest.spyOn(db, 'select').mockImplementation((() => ({
        from: jest.fn(() => ({
          where: jest.fn(() => [])
        }))
      })) as any);
      req.file = { filename: 'avatar.jpg', mimetype: 'image/jpeg', path: '/tmp/avatar.jpg' } as any;
      await createProfile(req as Request, res);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        id: '123',
        username: 'testuser',
        email: 'test@example.com',
        preferredName: 'Testy',
        avatar: '/uploads/avatar.jpg',
      });
      selectMock.mockRestore();
    });
  });
}); 