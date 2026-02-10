# Test Plan - WISH-2119: Flag Scheduling Infrastructure

## Scope Summary

**Endpoints Touched:**
- `POST /api/admin/flags/:flagKey/schedule` - Create scheduled flag update
- `GET /api/admin/flags/:flagKey/schedule` - List schedules for flag
- `DELETE /api/admin/flags/:flagKey/schedule/:scheduleId` - Cancel schedule

**UI Touched:** No (admin API endpoints only)

**Data/Storage Touched:** Yes
- New table: `feature_flag_schedules`
- Updates to: `feature_flags` table (via scheduled updates)
- Redis cache invalidation on flag updates

**Infrastructure:**
- Cron job running every 1 minute
- Row-level locking (FOR UPDATE SKIP LOCKED)

---

## Happy Path Tests

### Test 1: Create One-Time Schedule

**Setup:**
- Admin user authenticated
- Feature flag `wishlist-gallery` exists with `enabled = false`
- Schedule time: 2 minutes in future

**Action:**
```http
POST /api/admin/flags/wishlist-gallery/schedule
Content-Type: application/json
Authorization: Bearer {admin_token}

{
  "scheduledAt": "2026-01-29T10:02:00Z",
  "updates": {
    "enabled": true,
    "rolloutPercentage": 100
  }
}
```

**Expected Outcome:**
- Response: 201 Created
- Response body contains schedule ID, status = 'pending'
- Database: schedule record created with status = 'pending'

**Evidence:**
- Log schedule ID from response
- Verify database row exists: `SELECT * FROM feature_flag_schedules WHERE id = {schedule_id}`
- Assert response schema matches `FeatureFlagScheduleResponseSchema`

---

### Test 2: Cron Job Processes Pending Schedule

**Setup:**
- Schedule created in Test 1 exists
- Current time >= scheduled_at time
- Cron job runs (wait for next 1-minute cycle)

**Action:**
- Wait for cron job execution (max 60 seconds)
- Query flag state: `GET /api/config/flags/wishlist-gallery`

**Expected Outcome:**
- Schedule status changed to 'applied'
- Flag `wishlist-gallery` updated: `enabled = true, rolloutPercentage = 100`
- Redis cache invalidated (subsequent requests return updated flag)
- CloudWatch logs show schedule processing

**Evidence:**
- Database query: `SELECT status FROM feature_flag_schedules WHERE id = {schedule_id}` returns 'applied'
- Database query: `SELECT enabled, rollout_percentage FROM feature_flags WHERE flag_key = 'wishlist-gallery'` returns true, 100
- API response: `GET /api/config/flags/wishlist-gallery` returns `{ enabled: true, rolloutPercentage: 100 }`
- CloudWatch logs contain: `"message": "Schedule applied", "scheduleId": "{schedule_id}"`

---

### Test 3: List Schedules for Flag

**Setup:**
- Admin user authenticated
- Schedule created in Test 1 exists (status = 'applied')

**Action:**
```http
GET /api/admin/flags/wishlist-gallery/schedule
Authorization: Bearer {admin_token}
```

**Expected Outcome:**
- Response: 200 OK
- Response body: array with schedule from Test 1
- Each schedule includes: id, scheduledAt, status, updates, createdAt

**Evidence:**
- Verify array length >= 1
- Assert schedule matches creation data
- Assert response schema matches `FeatureFlagScheduleListResponseSchema`

---

### Test 4: Cancel Pending Schedule

**Setup:**
- Admin user authenticated
- Create new schedule for 10 minutes in future
- Schedule status = 'pending'

**Action:**
```http
DELETE /api/admin/flags/wishlist-gallery/schedule/{schedule_id}
Authorization: Bearer {admin_token}
```

**Expected Outcome:**
- Response: 200 OK
- Schedule status changed to 'cancelled'
- Cron job skips cancelled schedule

**Evidence:**
- Database query: `SELECT status FROM feature_flag_schedules WHERE id = {schedule_id}` returns 'cancelled'
- Wait for scheduled_at time to pass + 2 minutes
- Verify flag NOT updated (status remains 'cancelled', flag unchanged)

---

## Error Cases

### Error 1: Unauthorized Access (Non-Admin User)

**Setup:**
- Regular user authenticated (no admin role)
- Flag `wishlist-gallery` exists

**Action:**
```http
POST /api/admin/flags/wishlist-gallery/schedule
Authorization: Bearer {regular_user_token}

{
  "scheduledAt": "2026-01-29T10:05:00Z",
  "updates": { "enabled": true }
}
```

**Expected Outcome:**
- Response: 403 Forbidden
- Error message: "Admin access required"
- No schedule created

**Evidence:**
- Assert status code = 403
- Assert error response schema
- Database: no schedule row created

---

### Error 2: Invalid Flag Key (Non-Existent Flag)

**Setup:**
- Admin user authenticated
- Flag `nonexistent-flag` does NOT exist

**Action:**
```http
POST /api/admin/flags/nonexistent-flag/schedule
Authorization: Bearer {admin_token}

{
  "scheduledAt": "2026-01-29T10:05:00Z",
  "updates": { "enabled": true }
}
```

**Expected Outcome:**
- Response: 404 Not Found
- Error message: "Feature flag not found"

**Evidence:**
- Assert status code = 404
- Assert error message in response body

---

### Error 3: Invalid scheduledAt Time (Past Time)

**Setup:**
- Admin user authenticated
- Flag `wishlist-gallery` exists

**Action:**
```http
POST /api/admin/flags/wishlist-gallery/schedule
Authorization: Bearer {admin_token}

{
  "scheduledAt": "2020-01-01T00:00:00Z",
  "updates": { "enabled": true }
}
```

**Expected Outcome:**
- Response: 400 Bad Request
- Error message: "scheduledAt must be in the future"
- Zod validation error

**Evidence:**
- Assert status code = 400
- Assert Zod error structure in response

---

### Error 4: Invalid Rollout Percentage (Out of Range)

**Setup:**
- Admin user authenticated
- Flag `wishlist-gallery` exists

**Action:**
```http
POST /api/admin/flags/wishlist-gallery/schedule
Authorization: Bearer {admin_token}

{
  "scheduledAt": "2026-01-29T10:05:00Z",
  "updates": {
    "enabled": true,
    "rolloutPercentage": 150
  }
}
```

**Expected Outcome:**
- Response: 400 Bad Request
- Error message: "rolloutPercentage must be between 0 and 100"
- Zod validation error

**Evidence:**
- Assert status code = 400
- Assert Zod error for rolloutPercentage field

---

### Error 5: Cancel Non-Existent Schedule

**Setup:**
- Admin user authenticated
- Schedule ID does not exist: `00000000-0000-0000-0000-000000000000`

**Action:**
```http
DELETE /api/admin/flags/wishlist-gallery/schedule/00000000-0000-0000-0000-000000000000
Authorization: Bearer {admin_token}
```

**Expected Outcome:**
- Response: 404 Not Found
- Error message: "Schedule not found"

**Evidence:**
- Assert status code = 404

---

### Error 6: Cron Job Handles Failed Flag Update

**Setup:**
- Create schedule with invalid flag_id (simulate database constraint)
- Schedule status = 'pending', scheduled_at in past

**Action:**
- Cron job processes schedule
- Flag update fails (database error)

**Expected Outcome:**
- Schedule status changed to 'failed'
- CloudWatch error log captured
- Other pending schedules still processed (error isolation)

**Evidence:**
- Database: schedule status = 'failed'
- CloudWatch logs contain error: `"message": "Failed to apply schedule", "error": "..."`

---

## Edge Cases (Reasonable)

### Edge 1: Concurrent Cron Job Execution (Row Locking)

**Setup:**
- Create 5 pending schedules with scheduled_at in past
- Simulate 2 concurrent cron job executions (manual trigger)

**Action:**
- Trigger cron job Lambda twice simultaneously (different execution contexts)

**Expected Outcome:**
- All 5 schedules processed exactly once (no duplicates)
- Row-level locking (FOR UPDATE SKIP LOCKED) prevents double-processing
- Both cron executions complete successfully

**Evidence:**
- All 5 schedules have status = 'applied' (or 'failed')
- No schedule processed twice (verify via appliedAt timestamps)
- CloudWatch logs show both executions completed

---

### Edge 2: Schedule Exactly at Minute Boundary

**Setup:**
- Create schedule with scheduledAt = "2026-01-29T10:05:00.000Z" (exact minute)
- Current time approaches boundary

**Action:**
- Wait for cron job to process at 10:05:XX (within same minute)

**Expected Outcome:**
- Schedule processed successfully within same minute
- Status = 'applied'
- Flag updated correctly

**Evidence:**
- Schedule applied within 60 seconds of scheduled time
- Database: appliedAt timestamp <= scheduledAt + 60 seconds

---

### Edge 3: Cancel Already-Applied Schedule

**Setup:**
- Schedule exists with status = 'applied' (from Test 2)

**Action:**
```http
DELETE /api/admin/flags/wishlist-gallery/schedule/{applied_schedule_id}
Authorization: Bearer {admin_token}
```

**Expected Outcome:**
- Response: 400 Bad Request
- Error message: "Cannot cancel schedule with status: applied"

**Evidence:**
- Assert status code = 400
- Database: schedule status remains 'applied' (unchanged)

---

### Edge 4: Large Batch of Pending Schedules

**Setup:**
- Create 100 pending schedules (scheduled_at in past, different flags)
- All schedules ready for processing

**Action:**
- Cron job executes (single run)

**Expected Outcome:**
- All 100 schedules processed within acceptable time (< 30 seconds)
- All flags updated correctly
- Cron job completes without timeout

**Evidence:**
- All 100 schedules have status = 'applied' or 'failed'
- CloudWatch logs show total processing time
- No Lambda timeout errors

---

### Edge 5: Schedule Updates Multiple Flag Properties

**Setup:**
- Admin user authenticated
- Flag `wishlist-gallery` exists: `enabled = false, rolloutPercentage = 0`

**Action:**
```http
POST /api/admin/flags/wishlist-gallery/schedule
Authorization: Bearer {admin_token}

{
  "scheduledAt": "2026-01-29T10:10:00Z",
  "updates": {
    "enabled": true,
    "rolloutPercentage": 50
  }
}
```

**Expected Outcome:**
- Schedule created successfully
- After processing: both properties updated atomically
- Flag state: `enabled = true, rolloutPercentage = 50`

**Evidence:**
- Database query after processing shows both fields updated
- Redis cache reflects both changes
- API response returns updated flag with both properties

---

### Edge 6: Empty Updates Object

**Setup:**
- Admin user authenticated

**Action:**
```http
POST /api/admin/flags/wishlist-gallery/schedule
Authorization: Bearer {admin_token}

{
  "scheduledAt": "2026-01-29T10:15:00Z",
  "updates": {}
}
```

**Expected Outcome:**
- Response: 400 Bad Request
- Error message: "updates must contain at least one property"
- Zod validation error

**Evidence:**
- Assert status code = 400
- Assert Zod error structure

---

## Required Tooling Evidence

### Backend HTTP Tests

**Required `.http` file:** `__http__/feature-flag-scheduling.http`

**Minimum Assertions:**
1. **Create schedule**: Assert 201 status, schedule ID present, status = 'pending'
2. **List schedules**: Assert 200 status, array returned, correct schedule data
3. **Cancel schedule**: Assert 200 status, status changed to 'cancelled'
4. **Unauthorized access**: Assert 403 status for non-admin
5. **Invalid flag**: Assert 404 status for non-existent flag
6. **Invalid scheduledAt**: Assert 400 status for past time
7. **Invalid rolloutPercentage**: Assert 400 status for out-of-range value

**Fields to Assert:**
- Response status codes (201, 200, 400, 403, 404)
- Schedule properties: id, flagKey, scheduledAt, status, updates
- Error messages match expected format
- Zod validation error structure

---

### Backend Integration Tests

**Cron Job Processing Test:**
- Create schedule with scheduledAt in past
- Manually invoke cron job handler
- Assert schedule status = 'applied'
- Assert flag updated in database
- Assert Redis cache invalidated

**Row Locking Test:**
- Create multiple pending schedules
- Invoke cron job handler concurrently (simulate race condition)
- Assert each schedule processed exactly once
- Assert no duplicate flag updates

---

### Frontend Tests

**N/A** - This story has no user-facing UI components. All endpoints are admin-only APIs.

---

## Risks to Call Out

### Risk 1: Cron Job Timing Precision

**Issue:** Cron job runs every 1 minute, but exact timing may vary (45-75 seconds between runs)

**Impact:** Scheduled flag updates may be delayed up to 60 seconds from exact scheduledAt time

**Mitigation:** Document acceptable delay window (±60 seconds) in acceptance criteria

---

### Risk 2: Failed Flag Update Handling

**Issue:** If flag update fails (database error, Redis unavailable), schedule status = 'failed' but no automatic retry

**Impact:** Admin must manually retry failed schedules

**Mitigation:**
- Log detailed error messages to CloudWatch for debugging
- Document manual retry process in runbook
- Consider future story for automatic retry with exponential backoff

---

### Risk 3: Concurrent Schedule Creation for Same Flag

**Issue:** Two admins create overlapping schedules for same flag at nearly same time

**Impact:** Both schedules will execute, potentially causing unexpected flag state

**Mitigation:**
- Document admin best practices (check existing schedules first)
- Consider adding unique constraint on (flag_id, scheduled_at) in future story

---

### Risk 4: Cache Invalidation Lag

**Issue:** Redis cache has 5-minute TTL (from WISH-2009). Scheduled flag updates invalidate cache, but frontend may not see update for up to 5 minutes if cache refresh hasn't occurred.

**Impact:** Users may see stale flag state for up to 5 minutes after schedule applies

**Mitigation:**
- Accept 5-minute lag as acceptable for MVP (matches WISH-2009 design)
- Document cache behavior in API docs
- Consider real-time updates in future story (WebSocket notifications)

---

### Risk 5: No Audit Trail for Schedule Creation

**Issue:** No tracking of which admin user created/cancelled schedules

**Impact:** Cannot determine who scheduled flag changes for accountability

**Mitigation:**
- Defer audit logging to WISH-2019 (flag audit logging story)
- Log schedule CRUD operations to CloudWatch structured logs (temporary solution)
- Add created_by / cancelled_by columns in future story
