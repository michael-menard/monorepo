/**
 * AddItemModule
 *
 * Entry point for the Add Wishlist Item feature module.
 * This module is designed to be lazy-loaded by the shell app at /wishlist/add.
 *
 * Story wish-2002: Add Item Flow
 */

import { z } from 'zod'
import { Provider } from 'react-redux'
import { store } from './store'
import { ModuleLayout } from './components/module-layout'
import { AddItemPage } from './pages/add-item-page'

/**
 * Module props schema
 */
const AddItemModulePropsSchema = z.object({
  /** Called when navigation to wishlist is requested */
  onNavigateBack: z.function().args().returns(z.void()),
  /** Optional className for styling */
  className: z.string().optional(),
})

export type AddItemModuleProps = z.infer<typeof AddItemModulePropsSchema>

/**
 * AddItemModule Component
 *
 * This is the main export that the shell app will lazy-load.
 * Includes Redux Provider for RTK Query wishlist API.
 */
export function AddItemModule({ onNavigateBack, className }: AddItemModuleProps) {
  return (
    <Provider store={store}>
      <ModuleLayout className={className}>
        <AddItemPage onNavigateBack={onNavigateBack} />
      </ModuleLayout>
    </Provider>
  )
}

// Default export for lazy loading
export default AddItemModule
