import { createRoute, redirect } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import type { RootRoute } from '@tanstack/react-router'
import { createTanStackRouteGuard } from '../lib/auth-guard'

function TanStackQueryDemo() {
  const { data } = useQuery({
    queryKey: ['people'],
    queryFn: () => Promise.resolve([{ name: 'John Doe' }, { name: 'Jane Doe' }]),
    initialData: [],
  })

  return (
    <div className="p-4">
      <h1 className="text-2xl mb-4">People list</h1>
      <ul>
        {data?.map(person => (
          <li key={person.name}>{person.name}</li>
        ))}
      </ul>
    </div>
  )
}

export default (parentRoute: RootRoute) =>
  createRoute({
    path: '/demo/tanstack-query',
    beforeLoad: createTanStackRouteGuard(
      {
        requireAuth: true, // Requires authentication
        requireVerified: true, // Requires email verification
      },
      redirect,
    ),
    component: TanStackQueryDemo,
    getParentRoute: () => parentRoute,
  })
