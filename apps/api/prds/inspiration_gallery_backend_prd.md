---
tags: ['@backend', '#inspiration-gallery', '#s3', '#elasticsearch', '#postgres', '#privacy', '#moderation']
priority: 2
---

# 🖼️ Inspiration Gallery – Backend PRD

## 1. Overview

Backend support for the Inspiration Gallery: handles image storage, indexing, metadata storage, and moderation logic.

---

## 2. Responsibilities

- Store images in S3
- Strip EXIF metadata on upload
- Store metadata in PostgreSQL
- Index searchable fields in Elasticsearch
- Allow image flagging and delete
- Enforce visibility (owner or admin only)

---

## 3. Suggested Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/images` | Upload images |
| PATCH | `/api/images/:id` | Edit metadata |
| DELETE | `/api/images/:id` | Delete image |
| GET | `/api/albums/:id` | Get album data |
| POST | `/api/flag` | Flag content |

---

## 4. Test Cases

| ID | Description | Expected |
|----|-------------|----------|
| TC01 | Upload image to S3 | File stored |
| TC02 | Upload image with EXIF | EXIF stripped |
| TC03 | Add metadata | Stored in Postgres |
| TC04 | Search by tag | Elasticsearch returns matches |
| TC05 | Flag content | Entry created, prevent duplicates |
| TC06 | Unauthorized access | 403 error |

---

## 5. Edge Cases

| Scenario | Handling |
|----------|----------|
| Upload >50MB | Reject or compress |
| Duplicate filename | Use hash or UUID |
| Search index failure | Show fallback UI |
| Album with 0 images | Hide or auto-delete |
| Flagged repeatedly | One flag per user |
