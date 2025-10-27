import { Router } from 'express'
import { requireAuth, wishlistOwnershipAuth } from '../middleware/auth'
import {
  getWishlist,
  createWishlistItem,
  updateWishlistItem,
  deleteWishlistItem,
  reorderWishlist,
  reorderWishlistDebounced,
  getReorderStatus,
  cancelPendingReorder,
  uploadWishlistImage,
  deleteWishlistImageHandler,
  searchWishlist,
} from '../handlers/wishlist'
import { wishlistImageUpload } from '../storage/wishlist-storage'
import {
  handleWishlistUploadError,
  validateWishlistFile,
  cleanupWishlistFileOnError,
} from '../middleware/wishlist-upload'
import { wishlistCache, wishlistCacheInvalidation } from '../middleware/cache'

const router = Router()

// GET /api/wishlist - Get all wishlist items for authenticated user
router.get('/', requireAuth, wishlistOwnershipAuth, wishlistCache, getWishlist)

// GET /api/wishlist/search - Search wishlist items with full-text and category filtering
router.get('/search', requireAuth, wishlistOwnershipAuth, wishlistCache, searchWishlist)

// POST /api/wishlist - Create new wishlist item
router.post('/', requireAuth, wishlistOwnershipAuth, wishlistCacheInvalidation, createWishlistItem)

// PUT /api/wishlist/:id - Update wishlist item
router.put(
  '/:id',
  requireAuth,
  wishlistOwnershipAuth,
  wishlistCacheInvalidation,
  updateWishlistItem,
)

// PATCH /api/wishlist/:id - Update wishlist item (partial update)
router.patch(
  '/:id',
  requireAuth,
  wishlistOwnershipAuth,
  wishlistCacheInvalidation,
  updateWishlistItem,
)

// DELETE /api/wishlist/:id - Delete wishlist item
router.delete(
  '/:id',
  requireAuth,
  wishlistOwnershipAuth,
  wishlistCacheInvalidation,
  deleteWishlistItem,
)

// PUT /api/wishlist/reorder - Reorder wishlist items
router.put(
  '/reorder',
  requireAuth,
  wishlistOwnershipAuth,
  wishlistCacheInvalidation,
  reorderWishlist,
)

// POST /api/wishlist/reorder - Reorder wishlist items (alternative method)
router.post(
  '/reorder',
  requireAuth,
  wishlistOwnershipAuth,
  wishlistCacheInvalidation,
  reorderWishlist,
)

// POST /api/wishlist/reorder/debounced - Debounced reorder for rapid UI updates
router.post(
  '/reorder/debounced',
  requireAuth,
  wishlistOwnershipAuth,
  wishlistCacheInvalidation,
  reorderWishlistDebounced,
)

// GET /api/wishlist/reorder/status - Get reorder status
router.get('/reorder/status', requireAuth, getReorderStatus)

// POST /api/wishlist/reorder/cancel - Cancel pending reorder
router.post('/reorder/cancel', requireAuth, cancelPendingReorder)

// POST /api/wishlist/upload-image - Upload image for wishlist
router.post(
  '/upload-image',
  requireAuth,
  wishlistOwnershipAuth,
  wishlistImageUpload.single('image'),
  handleWishlistUploadError,
  validateWishlistFile,
  wishlistCacheInvalidation,
  uploadWishlistImage,
  cleanupWishlistFileOnError,
)

// DELETE /api/wishlist/image - Delete wishlist image
router.delete(
  '/image',
  requireAuth,
  wishlistOwnershipAuth,
  wishlistCacheInvalidation,
  deleteWishlistImageHandler,
)

export default router
