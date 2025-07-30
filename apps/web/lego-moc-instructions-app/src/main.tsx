import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import { Provider } from 'react-redux'
import {
  Outlet,
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import TanStackQueryDemo from './routes/demo.tanstack-query.tsx'
import { homeRoute } from './routes/home.tsx'
import { mocDetailRoute } from './routes/moc-detail.tsx'
import { mocGalleryRoute } from './routes/moc-gallery.tsx'
import { profileRoute } from './routes/profile.tsx'
import { wishlistRoute } from './routes/wishlist.tsx'
import { loginRoute } from './routes/auth/login.tsx'
import { signupRoute } from './routes/auth/signup.tsx'
import { forgotPasswordRoute } from './routes/auth/forgot-password.tsx'
import { resetPasswordRoute } from './routes/auth/reset-password.tsx'
import { verifyEmailRoute } from './routes/auth/verify-email.tsx'

import Layout from './components/Layout'

import TanStackQueryLayout from './integrations/tanstack-query/layout.tsx'

import * as TanStackQueryProvider from './integrations/tanstack-query/root-provider.tsx'

import './styles.css'
import reportWebVitals from './reportWebVitals.ts'

import { store } from './store/store'

export const rootRoute = createRootRoute({
  component: () => (
    <Layout>
      <Outlet />
      <TanStackRouterDevtools />
      <TanStackQueryLayout />
    </Layout>
  ),
})

const routeTree = rootRoute.addChildren([
  homeRoute,
  TanStackQueryDemo(rootRoute),
  mocGalleryRoute,
  mocDetailRoute,
  profileRoute,
  wishlistRoute,
  loginRoute,
  signupRoute,
  forgotPasswordRoute,
  resetPasswordRoute,
  verifyEmailRoute,
])

const TanStackQueryProviderContext = TanStackQueryProvider.getContext()
const router = createRouter({
  routeTree,
  context: {
    ...TanStackQueryProviderContext,
  },
  defaultPreload: 'intent',
  scrollRestoration: true,
  defaultStructuralSharing: true,
  defaultPreloadStaleTime: 0,
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

const rootElement = document.getElementById('app')
if (rootElement && !rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement)
  root.render(
    <StrictMode>
      <Provider store={store}>
        <TanStackQueryProvider.Provider {...TanStackQueryProviderContext}>
          <RouterProvider router={router} />
        </TanStackQueryProvider.Provider>
      </Provider>
    </StrictMode>,
  )
}

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals()
