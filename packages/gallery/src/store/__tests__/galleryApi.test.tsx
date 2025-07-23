import React from 'react';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { renderHook, waitFor } from '@testing-library/react';
import { galleryApi } from '../galleryApi';

const API_URL = 'http://localhost/api/gallery';

const handlers = [
  http.get(`${API_URL}/`, ({ request }) => {
    console.log('MSW intercepted:', request.url);
    return HttpResponse.json({ data: [{ id: '1', url: 'img.jpg', title: 'Test', uploadDate: '2024-01-01' }] });
  }),
  http.get(`${API_URL}/:id`, ({ params, request }) => {
    console.log('MSW intercepted:', request.url);
    return HttpResponse.json({ data: { id: params.id, url: 'img.jpg', title: 'Test', uploadDate: '2024-01-01' } });
  }),
  http.post(`${API_URL}/`, ({ request }) => {
    console.log('MSW intercepted:', request.url);
    return HttpResponse.json({ data: { id: '2', url: 'img2.jpg', title: 'Uploaded', uploadDate: '2024-01-02' } });
  }),
  http.put(`${API_URL}/:id`, ({ params, request }) => {
    console.log('MSW intercepted:', request.url);
    return HttpResponse.json({ data: { id: params.id, url: 'img.jpg', title: 'Updated', uploadDate: '2024-01-01' } });
  }),
  http.delete(`${API_URL}/:id`, ({ request }) => {
    console.log('MSW intercepted:', request.url);
    return HttpResponse.json({ message: 'Deleted' });
  }),
];

const server = setupServer(...handlers);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('galleryApi', () => {
  const makeStore = () =>
    configureStore({
      reducer: { [galleryApi.reducerPath]: galleryApi.reducer },
      middleware: (gDM) => gDM().concat(galleryApi.middleware),
    });

  it('fetches images', async () => {
    const store = makeStore();
    const { result } = renderHook(() => galleryApi.endpoints.getImages.useQuery(), {
      wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
    });
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data?.data[0].title).toBe('Test');
  });

  it('fetches image by id', async () => {
    const store = makeStore();
    const { result } = renderHook(() => galleryApi.endpoints.getImageById.useQuery('1'), {
      wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
    });
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data?.data.id).toBe('1');
  });

  it('handles error state', async () => {
    server.use(
      http.get(`${API_URL}/`, () => HttpResponse.status(500))
    );
    const store = makeStore();
    const { result } = renderHook(() => galleryApi.endpoints.getImages.useQuery(), {
      wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
    });
    await waitFor(() => expect(result.current.error).toBeDefined());
  });
}); 