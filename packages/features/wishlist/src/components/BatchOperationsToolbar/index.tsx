import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Trash2, CheckCircle, Circle, X, Check, Tag, DollarSign } from 'lucide-react'
import { Button } from '@repo/ui'
import { z } from 'zod'
import {
  useBatchDeleteWishlistItemsMutation,
  useBatchTogglePurchasedMutation,
  useBatchUpdateWishlistItemsMutation,
} from '../../store/wishlistApi.js'

// Zod schema for batch operations
const BatchOperationsSchema = z.object({
  selectedItems: z.array(z.string()).min(1, 'At least one item must be selected'),
  operation: z.enum(['delete', 'togglePurchased', 'updatePriority', 'updateCategory']),
  wishlistId: z.string().uuid(),
  data: z.any().optional(),
})

type BatchOperationsData = z.infer<typeof BatchOperationsSchema>

export interface BatchOperationsToolbarProps {
  selectedItems: string[]
  totalItems: number
  wishlistId: string
  onClearSelection: () => void
  onItemsDeleted?: (deletedIds: string[]) => void
  onItemsUpdated?: (updatedIds: string[]) => void
  onItemsToggled?: (toggledIds: string[], isPurchased: boolean) => void
  className?: string
}

const BatchOperationsToolbar: React.FC<BatchOperationsToolbarProps> = ({
  selectedItems,
  totalItems,
  wishlistId,
  onClearSelection,
  onItemsDeleted,
  onItemsUpdated,
  onItemsToggled,
  className = '',
}) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showPriorityDialog, setShowPriorityDialog] = useState(false)
  const [showCategoryDialog, setShowCategoryDialog] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [newPriority, setNewPriority] = useState<'low' | 'medium' | 'high'>('medium')
  const [newCategory, setNewCategory] = useState('')

  // RTK Query mutations
  const [batchDelete] = useBatchDeleteWishlistItemsMutation()
  const [batchTogglePurchased] = useBatchTogglePurchasedMutation()
  const [batchUpdate] = useBatchUpdateWishlistItemsMutation()

  const selectedCount = selectedItems.length
  const isVisible = selectedCount > 0

  const handleBatchDelete = async () => {
    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true)
      return
    }

    setIsProcessing(true)
    try {
      const result: any = await batchDelete({ wishlistId, itemIds: selectedItems })
      onItemsDeleted?.(result?.deletedIds ?? selectedItems)
      onClearSelection()
      setShowDeleteConfirm(false)
    } catch (error) {
      console.error('Failed to delete items:', error)
      // You might want to show a toast notification here
    } finally {
      setIsProcessing(false)
    }
  }

  const handleBatchTogglePurchased = async (isPurchased: boolean) => {
    setIsProcessing(true)
    try {
      const result: any = await batchTogglePurchased({
        wishlistId,
        itemIds: selectedItems,
        isPurchased,
      })
      onItemsToggled?.(result?.updatedIds ?? selectedItems, isPurchased)
      onClearSelection()
    } catch (error) {
      console.error('Failed to toggle purchased status:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleBatchUpdatePriority = async () => {
    setIsProcessing(true)
    try {
      const result: any = await batchUpdate({
        wishlistId,
        itemIds: selectedItems,
        data: { priority: newPriority },
      })
      onItemsUpdated?.(result?.updatedIds ?? selectedItems)
      onClearSelection()
      setShowPriorityDialog(false)
    } catch (error) {
      console.error('Failed to update priority:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleBatchUpdateCategory = async () => {
    setIsProcessing(true)
    try {
      const result: any = await batchUpdate({
        wishlistId,
        itemIds: selectedItems,
        data: { category: newCategory },
      })
      onItemsUpdated?.(result?.updatedIds ?? selectedItems)
      onClearSelection()
      setShowCategoryDialog(false)
    } catch (error) {
      console.error('Failed to update category:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  if (!isVisible) {
    return null
  }

  return (
    <>
      <motion.div
        className={`fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-4 ${className}`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex items-center gap-4">
          {/* Selection Info */}
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Check className="w-4 h-4 text-green-600" />
            <span>
              {selectedCount} of {totalItems} selected
            </span>
          </div>

          {/* Action Buttons */}
          <div
            className="flex items-center gap-2"
            aria-hidden={showPriorityDialog || showCategoryDialog || showDeleteConfirm}
          >
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBatchTogglePurchased(true)}
              disabled={isProcessing}
              className="flex items-center gap-1"
            >
              <CheckCircle className="w-4 h-4" />
              Mark Purchased
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBatchTogglePurchased(false)}
              disabled={isProcessing}
              className="flex items-center gap-1"
            >
              <Circle className="w-4 h-4" />
              Mark Not Purchased
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPriorityDialog(true)}
              disabled={isProcessing}
              className="flex items-center gap-1"
            >
              <DollarSign className="w-4 h-4" />
              Update Priority
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCategoryDialog(true)}
              disabled={isProcessing}
              className="flex items-center gap-1"
            >
              <Tag className="w-4 h-4" />
              Update Category
            </Button>

            <Button
              variant="destructive"
              size="sm"
              onClick={handleBatchDelete}
              disabled={isProcessing}
              className="flex items-center gap-1"
            >
              <Trash2 className="w-4 h-4" />
              {showDeleteConfirm ? 'Confirm Delete' : 'Delete'}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={onClearSelection}
              disabled={isProcessing}
              className="flex items-center gap-1"
            >
              <X className="w-4 h-4" />
              Clear
            </Button>
          </div>
        </div>

        {/* Processing Indicator */}
        <AnimatePresence>
          {isProcessing ? (
            <motion.div
              className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-lg"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                Processing...
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </motion.div>

      {/* Priority Update Dialog */}
      <AnimatePresence>
        {showPriorityDialog ? (
          <motion.div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white rounded-lg p-6 w-96"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              <h3 className="text-lg font-semibold mb-4">Update Priority</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    New Priority
                  </label>
                  <select
                    value={newPriority}
                    onChange={e => setNewPriority(e.target.value as 'low' | 'medium' | 'high')}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => setShowPriorityDialog(false)}
                    disabled={isProcessing}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleBatchUpdatePriority} disabled={isProcessing}>
                    Update
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Category Update Dialog */}
      <AnimatePresence>
        {showCategoryDialog ? (
          <motion.div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white rounded-lg p-6 w-96"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              <h3 className="text-lg font-semibold mb-4">Update Category</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    New Category
                  </label>
                  <input
                    type="text"
                    value={newCategory}
                    onChange={e => setNewCategory(e.target.value)}
                    placeholder="Enter category name"
                    className="w-full p-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => setShowCategoryDialog(false)}
                    disabled={isProcessing}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleBatchUpdateCategory} disabled={isProcessing}>
                    Update
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  )
}

export default BatchOperationsToolbar
