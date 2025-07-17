---
tags: ['@frontend', '#inspiration-gallery', '#component-library', '#image-upload', '#responsive', '#accessibility', '#dragdrop', '#elasticsearch', '#animation']
priority: 1
---

# 🖼️ Inspiration Gallery – Frontend PRD

## 1. Overview

A reusable `InspirationGallery` component for the Lego Projects app, designed to support image upload, album creation, and filtering. Built with React, Tailwind, ShadCN, and Framer Motion in a Turborepo setup.

---

## 2. Components

- `<InspirationGallery />`: Masonry layout, infinite scroll
- `<ImageUploadModal />`: Uses `FileUpload`, accepts `.jpg`, `.png`, `.heic`
- `<InspirationCard />`: Hover drawer, lightbox, tag display
- `<AlbumView />`: Reuses gallery layout for single album
- `<CreateAlbumDialog />`: Appears when dragging image onto another
- Multi-select checkbox + batch actions
- Filter bar with Elasticsearch integration

---

## 3. UX Features

- Hover drawer via Framer Motion
- Drag image onto another = create album
- Infinite scroll via IntersectionObserver
- Accessible keyboard nav (lightbox, tab flow)

---

## 4. Test Cases

| ID | Description | Expected |
|----|-------------|----------|
| TC01 | Upload `.jpg` | Appears in gallery |
| TC02 | Upload 5 `.png`s | Album auto-created |
| TC03 | Hover image | Drawer shows title, tags |
| TC04 | Click image | Opens in lightbox with keyboard nav |
| TC05 | Filter by tag | Gallery updates |
| TC06 | Drag onto another image | New album created |
| TC07 | Upload `.gif` | Error shown |
| TC08 | Batch select + delete | Images removed |
| TC09 | Flag image | Modal opens |
| TC10 | Delete prompt | Modal confirmation shown |

---

## 5. Edge Cases

| Scenario | Handling |
|----------|----------|
| 100+ uploads | Paginate or batch |
| Metadata includes emojis/symbols | Render safely |
| Drag image onto itself | Prevent interaction |
| Network fails mid-upload | Retry or show error |
| Album with 0 images | Hide or prompt deletion |
| Repeated flagging | One flag per user |

---

## 6. Stretch Goals

- Likes & favorites
- Comments
- Save to collection
- Reorder album images
- Admin dashboard
