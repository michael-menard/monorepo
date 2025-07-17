---
tags: ['@backend', '#wishlist', '#reminders', '#image-upload', '#reorder-persistence']
priority: 2
---

# 📄 User Wishlist Page – Backend PRD

## 1. Overview

Outlines backend support for the wishlist feature including data storage, ordering, validation, and reminder system foundations.

---

## 2. Responsibilities

- Store wishlist items with fields: `id`, `user_id`, `title`, `description`, `product_link`, `image_url`, `sort_order`
- Handle image uploads with validation (20MB max, .jpg/.heic only)
- Persist order changes after debounce or page unload
- Setup model and endpoint schema
- Enforce authorization on CRUD endpoints

---

## 3. Suggested Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/wishlist` | List items |
| POST | `/api/wishlist` | Add item |
| PATCH | `/api/wishlist/:id` | Update item |
| DELETE | `/api/wishlist/:id` | Remove item |
| POST | `/api/wishlist/reorder` | Persist new order |

---

## 4. Test Cases

| ID | Description | Expected |
|----|-------------|----------|
| TC01 | Add valid item | 200 OK |
| TC02 | Upload valid image | URL returned |
| TC03 | Upload bad format | 400 Bad Request |
| TC04 | Reorder items | Order saved |
| TC05 | Delete item | Deleted from DB |
| TC06 | Auth failure | 403 Forbidden |

---

## 5. Edge Cases

| Scenario | Handling |
|----------|----------|
| Unauthorized access | 403 Forbidden |
| Concurrent reorder ops | Conflict resolution |
| Image > 20MB | Reject with 413 |
| File corrupt or malformed | 422 Unprocessable Entity |

---

## 6. Future Enhancements

- Background job reminder system
- URL metadata scraping
- Shared wishlist functionality
