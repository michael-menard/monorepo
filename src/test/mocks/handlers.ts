import { http, HttpResponse } from 'msw';

// Default handlers for common API endpoints
export const handlers = [
  // Auth endpoints
  http.get('/api/auth/me', () => {
    return HttpResponse.json({
      user: {
        id: '1',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
      },
    });
  }),

  http.post('/api/auth/login', () => {
    return HttpResponse.json({
      success: true,
      message: 'Login successful',
    });
  }),

  http.post('/api/auth/signup', () => {
    return HttpResponse.json({
      success: true,
      message: 'Signup successful',
    });
  }),

  // Gallery endpoints
  http.get('/api/gallery/images', () => {
    return HttpResponse.json({
      images: [],
      total: 0,
    });
  }),

  http.get('/api/gallery/albums', () => {
    return HttpResponse.json({
      albums: [],
      total: 0,
    });
  }),

  // Wishlist endpoints
  http.get('/api/wishlist', () => {
    return HttpResponse.json({
      items: [],
      total: 0,
    });
  }),

  // Profile endpoints
  http.get('/api/profile', () => {
    return HttpResponse.json({
      profile: {
        id: '1',
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        avatar: null,
      },
    });
  }),

  // MOC endpoints
  http.get('/api/moc/instructions', () => {
    return HttpResponse.json({
      instructions: [],
      total: 0,
    });
  }),

  // Catch-all handler for unhandled requests
  http.all('*', ({ request }) => {
    console.warn(`Unhandled request: ${request.method} ${request.url}`);
    return HttpResponse.json(
      { error: 'Unhandled request' },
      { status: 404 }
    );
  }),
]; 