import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { GalleryModule } from '../modules/GalleryModule'
import { WishlistModule } from '../modules/WishlistModule'
import { InstructionsModule } from '../modules/InstructionsModule'
import { DashboardModule } from '../modules/DashboardModule'

// Mock Redux for this integration test
vi.mock('react-redux', () => ({
  useSelector: vi.fn(),
  useDispatch: () => vi.fn(),
  Provider: ({ children }: any) => children,
}))

// Mock the UI components with direct imports (no barrel files)
vi.mock('@repo/app-component-library', () => ({
  Card: ({ children, className }: any) => (
    <div className={className} data-testid="card">
      {children}
    </div>
  ),
  CardContent: ({ children }: any) => <div data-testid="card-content">{children}</div>,
  CardDescription: ({ children }: any) => <div data-testid="card-description">{children}</div>,
  CardHeader: ({ children }: any) => <div data-testid="card-header">{children}</div>,
  CardTitle: ({ children }: any) => <div data-testid="card-title">{children}</div>,
}))

// Mock Lucide icons
vi.mock('lucide-react', () => ({
  Images: (props: any) => <svg data-testid="images-icon" {...props} />,
  Heart: (props: any) => <svg data-testid="heart-icon" {...props} />,
  BookOpen: (props: any) => <svg data-testid="book-icon" {...props} />,
  LayoutDashboard: (props: any) => <svg data-testid="dashboard-icon" {...props} />,
  Upload: (props: any) => <svg data-testid="upload-icon" {...props} />,
  Search: (props: any) => <svg data-testid="search-icon" {...props} />,
  Filter: (props: any) => <svg data-testid="filter-icon" {...props} />,
  Star: (props: any) => <svg data-testid="star-icon" {...props} />,
  Share: (props: any) => <svg data-testid="share-icon" {...props} />,
  Download: (props: any) => <svg data-testid="download-icon" {...props} />,
  FileText: (props: any) => <svg data-testid="file-text-icon" {...props} />,
  Video: (props: any) => <svg data-testid="video-icon" {...props} />,
  BarChart3: (props: any) => <svg data-testid="bar-chart-icon" {...props} />,
  Activity: (props: any) => <svg data-testid="activity-icon" {...props} />,
  Settings: (props: any) => <svg data-testid="settings-icon" {...props} />,
}))

describe('Module Loading Integration', () => {
  describe('Module rendering', () => {
    it('renders all modules without errors', async () => {
      const modules = [
        { Component: GalleryModule, name: 'Gallery' },
        { Component: WishlistModule, name: 'Wishlist' },
        { Component: InstructionsModule, name: 'Instructions' },
        { Component: DashboardModule, name: 'Dashboard' },
      ]

      for (const { Component } of modules) {
        const { unmount } = render(<Component />)

        // Each module should render without throwing
        expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()

        // Clean up for next iteration
        unmount()
      }
    })

    it('all modules have consistent structure', () => {
      const modules = [
        { Component: GalleryModule, description: /browse and discover amazing lego moc designs/i },
        { Component: WishlistModule, description: /save and organize your favorite lego mocs/i },
        {
          Component: InstructionsModule,
          description: /step-by-step building guides for lego mocs/i,
        },
        {
          Component: DashboardModule,
          description: /your personal overview and account management/i,
        },
      ]

      modules.forEach(({ Component, description }) => {
        const { unmount } = render(<Component />)

        // Each module should have:
        // 1. A main heading
        expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()

        // 2. A description paragraph
        expect(screen.getByText(description)).toBeInTheDocument()

        // 3. A loading placeholder
        expect(screen.getByText(/module loading/i)).toBeInTheDocument()

        // 4. Feature cards
        const cards = screen.getAllByTestId('card')
        expect(cards.length).toBeGreaterThanOrEqual(3)

        unmount()
      })
    })
  })

  describe('Module-specific content', () => {
    it('Gallery module shows gallery-specific features', () => {
      render(<GalleryModule />)

      expect(screen.getByText(/advanced search/i)).toBeInTheDocument()
      expect(screen.getByText(/smart filtering/i)).toBeInTheDocument()
      expect(screen.getByText(/batch upload/i)).toBeInTheDocument()
      // Use getAllByTestId to handle multiple icons and check the first one
      const imagesIcons = screen.getAllByTestId('images-icon')
      expect(imagesIcons[0]).toBeInTheDocument()
    })

    it('Wishlist module shows wishlist-specific features', () => {
      render(<WishlistModule />)

      // Use getAllByText to handle text appearing in both description and card title
      const priorityLevelsElements = screen.getAllByText(/priority levels/i)
      expect(priorityLevelsElements[0]).toBeInTheDocument()
      expect(screen.getByText(/share lists/i)).toBeInTheDocument()
      expect(screen.getByText(/export data/i)).toBeInTheDocument()
      // Use getAllByTestId to handle multiple icons
      const heartIcons = screen.getAllByTestId('heart-icon')
      expect(heartIcons[0]).toBeInTheDocument()
    })

    it('Instructions module shows instructions-specific features', () => {
      render(<InstructionsModule />)

      expect(screen.getByText(/pdf instructions/i)).toBeInTheDocument()
      expect(screen.getByText(/video guides/i)).toBeInTheDocument()
      expect(screen.getByText(/parts lists/i)).toBeInTheDocument()
      // Use getAllByTestId to handle multiple icons
      const bookIcons = screen.getAllByTestId('book-icon')
      expect(bookIcons[0]).toBeInTheDocument()
    })

    it('Dashboard module shows dashboard-specific features', () => {
      render(<DashboardModule />)

      expect(screen.getByText(/usage analytics/i)).toBeInTheDocument()
      // Use getAllByText to handle text appearing in both description and card title
      const recentActivityElements = screen.getAllByText(/recent activity/i)
      expect(recentActivityElements[0]).toBeInTheDocument()
      // Use getAllByText to handle text appearing in both description and card title
      const accountSettingsElements = screen.getAllByText(/account settings/i)
      expect(accountSettingsElements[0]).toBeInTheDocument()
      // Use getAllByTestId to handle multiple icons
      const dashboardIcons = screen.getAllByTestId('dashboard-icon')
      expect(dashboardIcons[0]).toBeInTheDocument()
    })
  })

  describe('Module accessibility', () => {
    it('all modules have proper heading hierarchy', () => {
      const modules = [GalleryModule, WishlistModule, InstructionsModule, DashboardModule]

      modules.forEach(Component => {
        const { unmount } = render(<Component />)

        // Should have exactly one h1
        const h1Elements = screen.getAllByRole('heading', { level: 1 })
        expect(h1Elements).toHaveLength(1)

        unmount()
      })
    })

    it('all modules have descriptive content', () => {
      const modules = [
        { Component: GalleryModule, description: /browse and discover amazing lego moc designs/i },
        { Component: WishlistModule, description: /save and organize your favorite lego mocs/i },
        {
          Component: InstructionsModule,
          description: /step-by-step building guides for lego mocs/i,
        },
        {
          Component: DashboardModule,
          description: /your personal overview and account management/i,
        },
      ]

      modules.forEach(({ Component, description }) => {
        const { unmount } = render(<Component />)

        expect(screen.getByText(description)).toBeInTheDocument()

        unmount()
      })
    })
  })

  describe('Module lazy loading simulation', () => {
    it('modules can be dynamically imported', async () => {
      // Simulate dynamic import
      const galleryModulePromise = Promise.resolve({ GalleryModule })
      const wishlistModulePromise = Promise.resolve({ WishlistModule })
      const instructionsModulePromise = Promise.resolve({ InstructionsModule })
      const dashboardModulePromise = Promise.resolve({ DashboardModule })

      const [gallery, wishlist, instructions, dashboard] = await Promise.all([
        galleryModulePromise,
        wishlistModulePromise,
        instructionsModulePromise,
        dashboardModulePromise,
      ])

      expect(gallery.GalleryModule).toBeDefined()
      expect(wishlist.WishlistModule).toBeDefined()
      expect(instructions.InstructionsModule).toBeDefined()
      expect(dashboard.DashboardModule).toBeDefined()
    })

    it('modules render correctly after lazy loading', async () => {
      // Simulate the lazy loading process
      const loadModule = async (modulePromise: Promise<any>) => {
        const module = await modulePromise
        return module
      }

      const galleryModule = await loadModule(Promise.resolve({ GalleryModule }))

      render(<galleryModule.GalleryModule />)

      await waitFor(() => {
        // Use getAllByRole to handle multiple headings with "Gallery" text
        const galleryHeadings = screen.getAllByRole('heading', { name: /gallery/i })
        expect(galleryHeadings[0]).toBeInTheDocument()
      })
    })
  })
})
