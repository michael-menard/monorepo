import React, { useState } from 'react'
import AddEditWishlistModal from '../AddEditWishlistModal/index.js'
import type { WishlistItem } from '../../schemas'
import Wishlist from './index.js'

const WishlistExample: React.FC = () => {
  const [selectedWishlistId] = useState('example-wishlist-id')
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingItem, setEditingItem] = useState<WishlistItem | null>(null)

  const handleItemEdit = (item: WishlistItem) => {
    setEditingItem(item)
    setShowAddModal(true)
  }

  const handleItemDelete = (id: string) => {
    console.log('Delete item:', id)
    // Handle individual item deletion
  }

  const handleItemTogglePurchased = (id: string) => {
    console.log('Toggle purchased:', id)
    // Handle individual item toggle
  }

  const handleItemsDeleted = (deletedIds: string[]) => {
    console.log('Batch deleted items:', deletedIds)
    // Handle batch deletion
  }

  const handleItemsUpdated = (updatedIds: string[]) => {
    console.log('Batch updated items:', updatedIds)
    // Handle batch updates
  }

  const handleItemsToggled = (toggledIds: string[], isPurchased: boolean) => {
    console.log('Batch toggled items:', toggledIds, 'isPurchased:', isPurchased)
    // Handle batch toggle
  }

  const handleModalClose = () => {
    setShowAddModal(false)
    setEditingItem(null)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Wishlist with Multi-Select</h1>
          <p className="text-gray-600 mb-4">
            Select multiple items using the checkboxes to enable batch operations.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">Available Batch Operations:</h3>
            <ul className="text-blue-800 space-y-1">
              <li>
                • <strong>Delete:</strong> Remove multiple items at once
              </li>
              <li>
                • <strong>Mark Purchased:</strong> Mark selected items as purchased
              </li>
              <li>
                • <strong>Mark Not Purchased:</strong> Mark selected items as not purchased
              </li>
              <li>
                • <strong>Update Priority:</strong> Change priority for multiple items
              </li>
              <li>
                • <strong>Update Category:</strong> Change category for multiple items
              </li>
            </ul>
          </div>
        </div>

        <div className="mb-4">
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            Add New Item
          </button>
        </div>

        <Wishlist
          wishlistId={selectedWishlistId}
          onItemEdit={handleItemEdit}
          onItemDelete={handleItemDelete}
          onItemTogglePurchased={handleItemTogglePurchased}
          onItemsDeleted={handleItemsDeleted}
          onItemsUpdated={handleItemsUpdated}
          onItemsToggled={handleItemsToggled}
        />

        {/* Add/Edit Modal */}
        <AddEditWishlistModal
          isOpen={showAddModal}
          onClose={handleModalClose}
          item={editingItem || undefined}
          wishlistId={selectedWishlistId}
        />
      </div>
    </div>
  )
}

export default WishlistExample
