import { describe, it, expect } from 'bun:test';
import { createApp } from './stub';

describe('Server Scaffold', () => {
  it('should create an app with HTTP server and socket.io', () => {
    const { app, httpServer, io } = createApp();
    
    expect(app).toBeDefined();
    expect(httpServer).toBeDefined();
    expect(io).toBeDefined();
  });

  it('should have a health check route', async () => {
    const { app } = createApp();
    const response = await app.request('/');
    
    expect(response.status).toBe(200);
    expect(await response.text()).toBe('Server is running');
  });
});