// Jest-based test file (migrated from Vitest)

// Place all jest.mock calls at the very top, before any imports
const dbMock = {
  select: jest.fn(() => { throw new Error('[TEST FAIL-FAST] dbMock.select was called'); }) as any,
  insert: jest.fn() as any,
  update: jest.fn() as any,
};
jest.mock('../src/db/client', () => {
  return { db: dbMock };
});

jest.mock('axios', () => ({
  __esModule: true,
  default: {
    post: jest.fn(() => Promise.resolve({ data: { token: 'mocked.new.token' } })),
    get: jest.fn(() => Promise.resolve({ data: {} })),
    put: jest.fn(() => Promise.resolve({ data: {} })),
    delete: jest.fn(() => Promise.resolve({ data: {} })),
  },
}));

jest.mock('jsonwebtoken', () => ({
  __esModule: true,
  ...jest.requireActual('jsonwebtoken'),
  verify: jest.fn(() => validPayload),
}));

// Restore required variables for tests
let uploadMock: any = {
  single: jest.fn(() => (req: any, res: any, next: any) => next()),
};
let fsMock: any = {
  existsSync: jest.fn(),
  unlinkSync: jest.fn(),
};
const validPayload = { sub: 'user-id', iss: 'lego-projects-api', exp: Math.floor(Date.now() / 1000) + 3600 };
const validToken = 'valid.jwt.token';

import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';

let app: any;
let profileRouter: any;
let mockUser: any;

beforeEach(async () => {
  mockUser = {
    id: 'user-123',
    username: 'testuser',
    email: 'test@example.com',
    preferredName: 'Testy',
    avatar: 'avatar.png',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  dbMock.select.mockReset();
  dbMock.insert.mockReset();
  dbMock.update.mockReset();
  fsMock.existsSync.mockReset();
  fsMock.unlinkSync.mockReset();
  uploadMock.single.mockReset();
  // Dynamically import the router after all mocks are set
  profileRouter = (await import('../src/routes')).profileRouter;
  app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use('/api/users', profileRouter);
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('Profile API Endpoints', () => {
  let app: express.Express;
  let profileRouter: any;
  let mockUser: any;

  beforeEach(async () => {
    jest.clearAllMocks();
    // Set up a fresh mock user for each test
    mockUser = {
      id: 'user-123',
      username: 'testuser',
      email: 'test@example.com',
      preferredName: 'Testy',
      avatar: 'avatar.png',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    // Reset all dbMock, fsMock, and uploadMock methods
    dbMock.select.mockReset();
    dbMock.insert.mockReset();
    dbMock.update.mockReset();
    // Set up the app and router after mocks
    app = express();
    app.use(express.json());
    app.use(cookieParser());
    profileRouter = (await import('../src/routes')).profileRouter;
    app.use('/api/users', profileRouter);
  });

  it('should return user profile when user exists', async () => {
    // Fail-fast: throw if this mock is called
    dbMock.select.mockImplementation(() => {
      throw new Error('[TEST FAIL-FAST] dbMock.select was called');
    });
    const response = await request(app)
      .get(`/api/users/${mockUser.id}`)
      .set('Cookie', [`token=${validToken}`])
      .expect(200);
    expect(response.body).toMatchObject({
      id: mockUser.id,
      username: mockUser.username,
      email: mockUser.email,
      preferredName: mockUser.preferredName,
      avatar: mockUser.avatar,
    });
  });

  it('should return 404 when user does not exist', async () => {
    validPayload.sub = 'nonexistent-id';
    // Mock db.select chain to resolve with empty array
    dbMock.select.mockReturnValue({
      from: () => ({
        where: () => Promise.resolve([])
      })
    });
    const response = await request(app)
      .get('/api/users/nonexistent-id')
      .set('Cookie', [`token=${validToken}`])
      .expect(404);
    expect(response.body).toEqual({ error: 'User not found' });
  });

  it('should return 500 on database error', async () => {
    validPayload.sub = mockUser.id;
    // Mock db.select chain to reject with error
    dbMock.select.mockReturnValue({
      from: () => ({
        where: () => Promise.reject(new Error('Database connection failed'))
      })
    });
    const response = await request(app)
      .get(`/api/users/${mockUser.id}`)
      .set('Cookie', [`token=${validToken}`])
      .expect(500);
    expect(response.body.error).toBe('Database error');
    expect(response.body.details).toMatch(/Database connection failed|Failed query/);
  });

  it('should create new profile with avatar when valid data provided', async () => {
    validPayload.sub = mockUser.id;
    // Mock db.select chain to resolve with empty array (user does not exist)
    dbMock.select.mockReturnValueOnce({
      from: () => ({
        where: () => Promise.resolve([])
      })
    });
    // Mock db.insert chain to resolve with new user
    dbMock.insert.mockReturnValue({
      values: () => ({
        returning: () => Promise.resolve([mockUser])
      })
    });
    uploadMock.single.mockImplementationOnce(() => (req: any, res: any, next: any) => {
      req.file = { originalname: 'avatar.png', buffer: Buffer.from('fake'), mimetype: 'image/jpeg', filename: 'avatar.png' };
      next();
    });
    const response = await request(app)
      .post(`/api/users/${mockUser.id}`)
      .set('Cookie', [`token=${validToken}`])
      .field('username', mockUser.username)
      .field('email', mockUser.email)
      .field('preferredName', mockUser.preferredName)
      .attach('avatar', Buffer.from('fake'), 'avatar.png')
      .expect(201);
    expect(response.body).toMatchObject({
      id: mockUser.id,
      username: mockUser.username,
      email: mockUser.email,
      preferredName: mockUser.preferredName,
      avatar: `/uploads/avatar.png`,
    });
  });

  it('should return 403 when no authentication provided', async () => {
    // No token provided
    const response = await request(app)
      .post(`/api/users/${mockUser.id}`)
      .field('username', mockUser.username)
      .field('email', mockUser.email)
      .field('preferredName', mockUser.preferredName)
      .attach('avatar', Buffer.from('fake'), 'avatar.png')
      .expect(403);
    expect(response.body).toHaveProperty('error');
  });

  it('should return 400 when avatar file is missing', async () => {
    validPayload.sub = mockUser.id;
    // Mock db.select chain to resolve with empty array (user does not exist)
    dbMock.select.mockReturnValueOnce({
      from: () => ({
        where: () => Promise.resolve([])
      })
    });
    dbMock.insert.mockReturnValue({
      values: () => ({
        returning: () => Promise.resolve([mockUser])
      })
    });
    uploadMock.single.mockImplementationOnce(() => (req: any, res: any, next: any) => {
      req.file = undefined;
      next();
    });
    const response = await request(app)
      .post(`/api/users/${mockUser.id}`)
      .set('Cookie', [`token=${validToken}`])
      .field('username', mockUser.username)
      .field('email', mockUser.email)
      .field('preferredName', mockUser.preferredName)
      .expect(400);
    expect(response.body).toEqual({ error: 'Avatar file is required' });
  });

  it('should return 400 for invalid file format', async () => {
    validPayload.sub = mockUser.id;
    dbMock.select.mockReturnValueOnce({
      from: () => ({
        where: () => Promise.resolve([])
      })
    });
    dbMock.insert.mockReturnValue({
      values: () => ({
        returning: () => Promise.resolve([mockUser])
      })
    });
    uploadMock.single.mockImplementationOnce(() => (req: any, res: any, next: any) => {
      req.file = { originalname: 'avatar.txt', buffer: Buffer.from('fake'), mimetype: 'text/plain', filename: 'avatar.txt' };
      next();
    });
    const response = await request(app)
      .post(`/api/users/${mockUser.id}`)
      .set('Cookie', [`token=${validToken}`])
      .field('username', mockUser.username)
      .field('email', mockUser.email)
      .field('preferredName', mockUser.preferredName)
      .attach('avatar', Buffer.from('fake'), 'avatar.txt')
      .expect(400);
    expect(response.body).toEqual({ error: 'Invalid file format. Only .jpg or .heic files are supported.' });
  });

  it('should return 409 when user already exists', async () => {
    validPayload.sub = mockUser.id;
    // Mock db.select chain to resolve with existing user
    dbMock.select.mockReturnValueOnce({
      from: () => ({
        where: () => Promise.resolve([mockUser])
      })
    });
    uploadMock.single.mockImplementationOnce(() => (req: any, res: any, next: any) => {
      req.file = { originalname: 'avatar.png', buffer: Buffer.from('fake'), mimetype: 'image/jpeg', filename: 'avatar.png' };
      next();
    });
    const response = await request(app)
      .post(`/api/users/${mockUser.id}`)
      .set('Cookie', [`token=${validToken}`])
      .field('username', mockUser.username)
      .field('email', mockUser.email)
      .field('preferredName', mockUser.preferredName)
      .attach('avatar', Buffer.from('fake'), 'avatar.png')
      .expect(409);
    expect(response.body).toEqual({ error: 'User already exists' });
  });

  it('should update profile when valid data provided', async () => {
    validPayload.sub = mockUser.id;
    const updatedUser = { ...mockUser, username: 'updateduser', email: 'updated@example.com', preferredName: 'Updated Name' };
    // Mock db.select chain to resolve with user (user exists)
    dbMock.select.mockReturnValueOnce({
      from: () => ({
        where: () => Promise.resolve([mockUser])
      })
    });
    // Mock db.update chain to resolve with updated user
    dbMock.update.mockReturnValue({
      set: () => ({
        where: () => ({
          returning: () => Promise.resolve([updatedUser])
        })
      })
    });
    const response = await request(app)
      .patch(`/api/users/${mockUser.id}`)
      .set('Cookie', [`token=${validToken}`])
      .send({ username: updatedUser.username, email: updatedUser.email, preferredName: updatedUser.preferredName })
      .expect(200);
    expect(response.body).toMatchObject({
      id: mockUser.id,
      username: updatedUser.username,
      email: updatedUser.email,
      preferredName: updatedUser.preferredName,
    });
  });

  it('should return 403 when no authentication provided', async () => {
    const response = await request(app)
      .patch(`/api/users/${mockUser.id}`)
      .send({ username: 'Updated Name', email: 'Updated email', preferredName: 'Updated Name' })
      .expect(403);
    expect(response.body).toHaveProperty('error');
  });

  it('should return 404 when user does not exist', async () => {
    validPayload.sub = 'nonexistent-id';
    // Mock db.select chain to resolve with empty array (user does not exist)
    dbMock.select.mockReturnValueOnce({
      from: () => ({
        where: () => Promise.resolve([])
      })
    });
    const response = await request(app)
      .patch('/api/users/nonexistent-id')
      .set('Cookie', [`token=${validToken}`])
      .send({ username: 'Updated Name', email: 'Updated email', preferredName: 'Updated Name' })
      .expect(404);
    expect(response.body).toEqual({ error: 'User not found' });
  });

  it('should return 400 for invalid input data', async () => {
    validPayload.sub = mockUser.id;
    // Mock db.select chain to resolve with user (user exists)
    dbMock.select.mockReturnValueOnce({
      from: () => ({
        where: () => Promise.resolve([mockUser])
      })
    });
    dbMock.update.mockReturnValue({
      set: () => ({
        where: () => ({
          returning: () => Promise.resolve([mockUser])
        })
      })
    });
    const response = await request(app)
      .patch(`/api/users/${mockUser.id}`)
      .set('Cookie', [`token=${validToken}`])
      .send({ username: '' }) // Empty username should fail validation
      .expect(400);
    expect(response.body).toHaveProperty('error');
  });

  it('should delete avatar when user exists', async () => {
    validPayload.sub = mockUser.id;
    // Mock db.select chain to resolve with user (user exists)
    dbMock.select.mockReturnValueOnce({
      from: () => ({
        where: () => Promise.resolve([mockUser])
      })
    });
    // Mock db.update chain to resolve with user with avatar null
    dbMock.update.mockReturnValue({
      set: () => ({
        where: () => ({
          returning: () => Promise.resolve([{ ...mockUser, avatar: null }])
        })
      })
    });
    fsMock.existsSync.mockReturnValueOnce(true);
    fsMock.unlinkSync.mockImplementationOnce(() => {});
    const response = await request(app)
      .delete(`/api/users/${mockUser.id}/avatar`)
      .set('Cookie', [`token=${validToken}`])
      .expect(200);
    expect(response.body.user).toMatchObject({
      id: mockUser.id,
      avatar: null,
    });
  });

  it('should return 403 when no authentication provided', async () => {
    const response = await request(app)
      .delete(`/api/users/${mockUser.id}/avatar`)
      .expect(403);
    expect(response.body).toHaveProperty('error');
  });

  it('should return 404 when user does not exist', async () => {
    validPayload.sub = 'nonexistent-id';
    // Mock db.select chain to resolve with empty array (user does not exist)
    dbMock.select.mockReturnValueOnce({
      from: () => ({
        where: () => Promise.resolve([])
      })
    });
    fsMock.existsSync.mockReturnValueOnce(false);
    const response = await request(app)
      .delete('/api/users/nonexistent-id/avatar')
      .set('Cookie', [`token=${validToken}`])
      .expect(404);
    expect(response.body).toEqual({ error: 'User not found' });
  });

  // S3-specific tests (stubbed)
  it.skip('should upload avatar to S3 and store S3 URL in user profile (TODO)', async () => {
    // TODO: Implement S3 upload test when ready
  });

  it.skip('should delete avatar from S3 when user deletes avatar (TODO)', async () => {
    // TODO: Implement S3 delete test when ready
  });
}); 