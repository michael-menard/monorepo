import { http, HttpResponse } from 'msw'

const baseUrl = 'http://localhost:3001'

const mockMinifigInstance = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  userId: 'user-1',
  variantId: '660e8400-e29b-41d4-a716-446655440000',
  displayName: 'Forestman - Green Hat',
  status: 'owned',
  condition: 'built',
  sourceType: 'set',
  sourceSetId: null,
  isCustom: false,
  purchasePrice: '12.99',
  purchaseTax: null,
  purchaseShipping: null,
  purchaseDate: '2026-01-15T00:00:00.000Z',
  purpose: 'Castle MOC',
  plannedUse: 'Display',
  notes: 'Good condition',
  imageUrl: null,
  sortOrder: null,
  tags: ['forestmen', 'castle'],
  variant: {
    id: '660e8400-e29b-41d4-a716-446655440000',
    userId: 'user-1',
    archetypeId: null,
    name: 'Forestman - Green Hat',
    legoNumber: 'cas002',
    theme: 'Castle',
    subtheme: 'Forestmen',
    year: 1990,
    cmfSeries: null,
    imageUrl: 'https://example.com/cas002.jpg',
    weight: '5.2g',
    dimensions: '4.0 x 1.6 x 1.3 cm',
    partsCount: 4,
    parts: [
      { partNumber: '3626', name: 'Head', color: 'Yellow', quantity: 1, position: 'head' },
      { partNumber: '973', name: 'Torso', color: 'Green', quantity: 1, position: 'torso' },
    ],
    appearsInSets: [{ setNumber: '6077-1', name: 'Forestmen River Fortress' }],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

const mockWantedInstance = {
  ...mockMinifigInstance,
  id: '770e8400-e29b-41d4-a716-446655440000',
  displayName: 'Stormtrooper',
  status: 'wanted',
  condition: null,
  tags: ['star-wars'],
}

export const handlers = [
  // GET /minifigs - list
  http.get(`${baseUrl}/minifigs`, ({ request }) => {
    const url = new URL(request.url)
    const status = url.searchParams.get('status')
    const search = url.searchParams.get('search')

    let items = [mockMinifigInstance, mockWantedInstance]

    if (status) {
      items = items.filter(i => i.status === status)
    }

    if (search) {
      items = items.filter(i =>
        i.displayName.toLowerCase().includes(search.toLowerCase()),
      )
    }

    return HttpResponse.json({
      items,
      pagination: {
        page: 1,
        limit: 24,
        total: items.length,
        totalPages: 1,
      },
    })
  }),

  // GET /minifigs/:id - detail
  http.get(`${baseUrl}/minifigs/:id`, ({ params }) => {
    if (params.id === mockMinifigInstance.id) {
      return HttpResponse.json(mockMinifigInstance)
    }
    if (params.id === mockWantedInstance.id) {
      return HttpResponse.json(mockWantedInstance)
    }
    return HttpResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
  }),

  // PATCH /minifigs/:id - update
  http.patch(`${baseUrl}/minifigs/:id`, async ({ params, request }) => {
    const body = await request.json()
    return HttpResponse.json({ ...mockMinifigInstance, ...body })
  }),

  // DELETE /minifigs/:id - delete
  http.delete(`${baseUrl}/minifigs/:id`, () => {
    return HttpResponse.json({ success: true })
  }),
]
