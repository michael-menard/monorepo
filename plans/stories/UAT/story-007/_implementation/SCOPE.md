# STORY-007 Scope Surface

backend: true
frontend: false
infra: true

## Notes

- **Backend**: Vercel handlers for get/list/search/flag images, extend `gallery-core` package with image operations, database seeds
- **Frontend**: No changes (Non-Goal: "No frontend modifications. Existing RTK Query slices continue to work unchanged.")
- **Infra**: Add routes to `vercel.json`, environment variables for DATABASE_URL, AUTH_BYPASS, DEV_USER_SUB
