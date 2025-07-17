---
tags: ['@frontend', '#moc-instructions', '#fileupload', '#inspiration-gallery', '#dragdrop', '#responsive', '#accessibility', '#ux']
priority: 1
---

# 📘 MOC Instructions Library – Frontend PRD

## Overview

Frontend implementation for the MOC Instructions Library. Users can upload instruction files, attach gallery images, and manage them via a masonry-style UI using Tailwind + ShadCN + Framer Motion.

---

## Components

- `<MocInstructionsGallery />`: masonry layout, infinite scroll, filter/search, hover drawer
- `<MocDetailPage />`: editable form (title, description, tags), thumbnail, file upload areas
- `<FileUpload />`: drag-and-drop, file type-specific behavior
- Routes: `/userId/mocs`, `/userId/mocs/:mocId`
- Reuses `<InspirationGallery />` layout and file handling components

---

## Test Cases

| ID | Description | Expected |
|----|-------------|----------|
| TC01 | Upload `.pdf` file | File saved, linked to MOC |
| TC02 | Upload `.io` file | Replaces or blocks duplicate |
| TC03 | Upload `.csv`, `.json` files | Links displayed for download |
| TC04 | Search by tag/title | Matching MOCs shown |
| TC05 | Edit title/description | Updates reflected in UI |
| TC06 | Select gallery image | Linked and shown in detail |
| TC07 | Remove file | File disappears from view |
| TC08 | Upload `.png` thumbnail | Preview shown |
| TC09 | Drag invalid file | Blocked with error |
| TC10 | No MOCs found | Show empty state |

---

## Edge Cases

- Unsupported file type → show validation error
- Second instruction file → reject or replace
- No matching search → empty state
- Large file → progress + graceful failure
- Removing all files → UI layout intact
