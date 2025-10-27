# Profile Page Backend Checklist

## Endpoints

- [ ] Implement `GET /api/users/:id` to fetch user profile (name, bio, avatar)
- [ ] Implement `POST /api/users/:id` to upload a new profile (including avatar)
- [ ] Implement `PATCH /api/users/:id` to update user info (name, bio, etc.)

## Avatar Upload & Validation

- [ ] Accept only `.jpg` and `.heic` file types for avatar uploads
- [ ] Validate file size (reject files >10MB with 413 error)
- [ ] Handle duplicate filenames (store with UUID or hash)
- [ ] Return 400 for invalid file format
- [ ] Return 413 for oversized uploads
- [ ] Return 422 for unexpected file structure

## Security

- [ ] Protect all profile update endpoints (require authentication)
- [ ] Return 403 for unauthorized upload or PATCH attempts

## Error Handling

- [ ] Return 500 if upload fails

## Testing (from PRD test cases)

- [ ] Test: GET profile returns correct data
- [ ] Test: POST profile with avatar saves file and returns URL
- [ ] Test: Invalid format upload returns 400
- [ ] Test: Unauthorized upload returns 403
- [ ] Test: Update name/bio returns 200
- [ ] Test: Oversized upload returns 413

## Edge Cases

- [ ] Avatar >10MB: Reject with 413
- [ ] Upload fails: Return 500
- [ ] Duplicate filename: Use UUID or hash
- [ ] Unauthorized PATCH: Return 403
- [ ] Unexpected file structure: Return 422
