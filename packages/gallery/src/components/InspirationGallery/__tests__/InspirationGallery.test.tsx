import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { galleryApi } from '../../../store/galleryApi';
import InspirationGallery from '../index';

const API_URL = 'http://localhost/api/gallery';

const handlers = [
  http.get(`${API_URL}/`, () =>
    HttpResponse.json({ data: [{ id: '1', url: 'img.jpg', title: 'Test', uploadDate: '2024-01-01' }] })
  ),
];

const server = setupServer(...handlers);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const makeStore = () =>
  configureStore({
    reducer: { [galleryApi.reducerPath]: galleryApi.reducer },
    middleware: (gDM) => gDM().concat(galleryApi.middleware),
  });

describe('InspirationGallery', () => {
  it('renders loading state', () => {
    render(
      <Provider store={makeStore()}>
        <InspirationGallery />
      </Provider>
    );
    expect(screen.getByText(/loading images/i)).toBeInTheDocument();
  });

  it('renders images', async () => {
    render(
      <Provider store={makeStore()}>
        <InspirationGallery />
      </Provider>
    );
    await waitFor(() => expect(screen.getByText('Test')).toBeInTheDocument());
  });

  it('renders empty state', async () => {
    server.use(
      http.get(`${API_URL}/`, () => HttpResponse.json({ data: [] }))
    );
    render(
      <Provider store={makeStore()}>
        <InspirationGallery />
      </Provider>
    );
    await waitFor(() => expect(screen.getByText(/no images found/i)).toBeInTheDocument());
  });

  it('renders error state', async () => {
    server.use(
      http.get(`${API_URL}/`, () => HttpResponse.status(500))
    );
    render(
      <Provider store={makeStore()}>
        <InspirationGallery />
      </Provider>
    );
    await waitFor(() => expect(screen.getByText(/failed to load images/i)).toBeInTheDocument());
  });
}); 