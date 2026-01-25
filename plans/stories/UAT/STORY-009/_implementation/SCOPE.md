# STORY-009 Scope

## Surfaces Impacted

```
backend: true
frontend: false
infra: true
```

## Rationale

**Backend: true**
- 5 new Vercel serverless endpoints (presign, register, delete, wishlist upload, gallery upload)
- New `@repo/vercel-multipart` package for multipart parsing
- S3 presigned URL generation
- Database operations for image records
- OpenSearch indexing (gallery)

**Frontend: false**
- Story explicitly states: "NOT modifying frontend upload components"
- All changes are API-layer only

**Infra: true**
- vercel.json updates (rewrites, function timeouts)
- Environment variables configuration
- S3 CORS configuration (documentation)
- New seed file for test data
