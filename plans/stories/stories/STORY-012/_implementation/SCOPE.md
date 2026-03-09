# STORY-012 Scope Surface

backend: true
frontend: false
infra: true

## Details

### Backend (true)
- GET `/api/mocs/:id/gallery-images` - List linked gallery images
- POST `/api/mocs/:id/gallery-images` - Link gallery image to MOC
- DELETE `/api/mocs/:id/gallery-images/:galleryImageId` - Unlink gallery image from MOC

### Frontend (false)
- Story explicitly states "No frontend modifications"
- Existing RTK Query slices continue unchanged

### Infra (true)
- `vercel.json` - Add 2 new route rewrites
- `seeds/mocs.ts` - Add moc_gallery_images seed data
