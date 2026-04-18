/**
 * Unified Sets Module
 *
 * Combines the Collection (owned) and Wishlist (wanted) micro-apps
 * under a single /sets route with sub-tabs.
 */

import { lazy, Suspense, useState } from 'react'
import { AppSetsGalleryModule } from '@repo/app-sets-gallery'
import { AppTabs, AppTabsList, AppTabsTrigger } from '@repo/app-component-library'
import { Package, Heart } from 'lucide-react'
import { LoadingPage } from '../pages/LoadingPage'

const WishlistGalleryModule = lazy(() => import('@repo/app-wishlist-gallery'))

type SubTab = 'collection' | 'wishlist'

export function SetsModule() {
  const [activeTab, setActiveTab] = useState<SubTab>('collection')

  return (
    <div>
      <div className="border-b border-border bg-background/60">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <AppTabs value={activeTab} onValueChange={v => setActiveTab(v as SubTab)}>
            <AppTabsList variant="underline" className="h-10 w-full justify-start">
              <AppTabsTrigger value="collection" variant="underline" className="gap-2 px-4">
                <Package className="h-4 w-4" />
                <span>Collection</span>
              </AppTabsTrigger>
              <AppTabsTrigger value="wishlist" variant="underline" className="gap-2 px-4">
                <Heart className="h-4 w-4" />
                <span>Wishlist</span>
              </AppTabsTrigger>
            </AppTabsList>
          </AppTabs>
        </div>
      </div>

      <Suspense fallback={<LoadingPage />}>
        {activeTab === 'collection' ? <AppSetsGalleryModule /> : <WishlistGalleryModule />}
      </Suspense>
    </div>
  )
}

export default SetsModule
