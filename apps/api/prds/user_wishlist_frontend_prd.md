---
tags: ['@frontend', '#wishlist', '#drag-and-drop', '#component-library', '#image-upload', '#responsive', '#accessibility']
priority: 1
---

# 📄 User Wishlist Page – Frontend PRD

## 1. Overview

A React-based wishlist interface that allows users to add, edit, delete, and reorder desired Lego builds. Built using Tailwind CSS and ShadCN components in a Turborepo.

---

## 2. Features

- Draggable wishlist cards
- Add/edit modal with asset upload
- Inline delete and confirmation
- Optimistic UI updates
- Custom thumbnail or asset search
- Reusable `WishlistItemCard` and `WishlistList` components

---

## 3. Components

- `WishlistItemCard`
  - Props: `title`, `description`, `image`, `productLink`, `onEdit`, `onDelete`
  - Drag handle and buttons

- `WishlistList`
  - Maps items and handles reorder sync

- `AddEditWishlistModal`
  - Used for both add and edit flows
  - Upload or select image

---

## 4. UI / UX

- Entire card draggable
- Responsive layout
- Reorder persists after 2s idle or page exit
- Accessible modals and buttons

---

## 5. Test Cases

| ID | Description | Expected |
|----|-------------|----------|
| TC01 | Add item (title only) | Card rendered |
| TC02 | Add full item | Card with image/link |
| TC03 | Drag reorder | New order saved |
| TC04 | Edit item | Card updated |
| TC05 | Delete item | Card removed |
| TC06 | Upload invalid file | Error shown |
| TC07 | Upload >20MB jpg | Rejected |
| TC08 | Resize window | Layout adapts |
| TC09 | Reorder via keyboard | Keyboard nav works |
| TC10 | Drag with only one item | No reordering occurs |

---

## 6. Edge Cases

| Scenario | Handling |
|----------|----------|
| Empty title submitted | Form blocked |
| Simultaneous tab edits | Last write wins |
| Navigating mid-drag | Persist on exit |
| Multiple quick uploads | Debounce uploads |

---

## 7. Stretch Goals

- Auto-scrape from URLs
- Public wishlist view
- Grouping and filters
