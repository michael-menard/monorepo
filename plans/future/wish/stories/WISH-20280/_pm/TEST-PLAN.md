# Test Plan: WISH-20280 - Audit Logging for Flag Schedule Operations

## Scope Summary

**Endpoints Touched:**
- `POST /api/admin/flags/:flagKey/schedule` - Add audit logging on schedule creation
- `DELETE /api/admin/flags/:flagKey/schedule/:scheduleId` - Add audit logging on schedule cancellation
- `GET /api/admin/flags/:flagKey/schedule` - Return admin tracking fields in response

**UI Touched:** No (backend-only infrastructure)

**Data/Storage Touched:** Yes
- Database: `feature_flag_schedules` table (add `created_by`, `cancelled_by`, `cancelled_at` columns)
- CloudWatch Logs: Structured audit events (`flag_schedule.created`, `flag_schedule.cancelled`, `flag_schedule.applied`, `flag_schedule.failed`)
- Audit service: New lightweight logger in `apps/api/lego-api/core/audit/`

---

## Happy Path Tests

### Test 1: Create schedule with admin tracking
**Setup:**
- Admin user authenticated with JWT (userId: "admin-123", email: "admin@example.com")
- Feature flag exists: `test-flag-audit`

**Action:**
- POST `/api/admin/flags/test-flag-audit/schedule` with body:
  ```json
  {
    "scheduledAt": "2026-02-15T10:00:00Z",
    "updates": { "enabled": true }
  }
  ```

**Expected Outcome:**
- HTTP 201 Created
- Response includes `created_by: "admin-123"` field
- Response includes `created_at` timestamp
- Database record persisted with `created_by = "admin-123"`
- CloudWatch audit event logged:
  - `eventType: "flag_schedule.created"`
  - `metadata: { scheduleId, flagKey, scheduledAt, updates, adminUserId: "admin-123", adminEmail: "admin@example.com" }`

**Evidence:**
- HTTP response body assertion: `created_by` field present
- Database query: `SELECT created_by FROM feature_flag_schedules WHERE id = :scheduleId`
- CloudWatch Logs Insights query: Filter for `flag_schedule.created` event with matching scheduleId

---

### Test 2: Cancel schedule with admin tracking
**Setup:**
- Existing schedule created by Admin A (userId: "admin-123")
- Admin B authenticated (userId: "admin-456", email: "admin-b@example.com")

**Action:**
- DELETE `/api/admin/flags/test-flag-audit/schedule/:scheduleId`

**Expected Outcome:**
- HTTP 200 OK
- Response includes `cancelled_by: "admin-456"` and `cancelled_at` timestamp
- Database record updated:
  - `cancelled_by = "admin-456"`
  - `cancelled_at = <current timestamp>`
- CloudWatch audit event logged:
  - `eventType: "flag_schedule.cancelled"`
  - `metadata: { scheduleId, flagKey, scheduledAt, adminUserId: "admin-456", adminEmail: "admin-b@example.com", reason: "manual_cancellation" }`

**Evidence:**
- HTTP response body assertion: `cancelled_by` and `cancelled_at` fields present
- Database query: `SELECT cancelled_by, cancelled_at FROM feature_flag_schedules WHERE id = :scheduleId`
- CloudWatch Logs Insights query: Filter for `flag_schedule.cancelled` event

---

### Test 3: Cron job applies schedule (automatic event logging)
**Setup:**
- Existing schedule with `scheduledAt` in the past
- Cron job triggered (no admin context)

**Action:**
- Cron job processes schedule and updates flag state

**Expected Outcome:**
- Schedule applied successfully
- Feature flag state updated per `updates` field
- CloudWatch audit event logged:
  - `eventType: "flag_schedule.applied"`
  - `metadata: { scheduleId, flagKey, updates, appliedAt, flagState: { enabled, rolloutPercentage } }`
  - **No admin user fields** (automatic process)

**Evidence:**
- Feature flag state assertion: `enabled` field updated
- CloudWatch Logs Insights query: Filter for `flag_schedule.applied` event with matching scheduleId
- Verify no `adminUserId` or `adminEmail` in metadata

---

### Test 4: GET schedules returns admin tracking fields
**Setup:**
- Multiple schedules exist with various `created_by` values
- Some schedules have `cancelled_by` fields (cancelled schedules)

**Action:**
- GET `/api/admin/flags/test-flag-audit/schedule`

**Expected Outcome:**
- HTTP 200 OK
- Response array includes for each schedule:
  - `created_by` field (string or null)
  - `cancelled_by` field (string or null for non-cancelled)
  - `cancelled_at` field (timestamp or null)

**Evidence:**
- HTTP response body assertion: All admin tracking fields present in each schedule object
- Schema validation: Response matches updated `ScheduleResponseSchema`

---

## Error Cases

### Error 1: Audit logging failure does NOT block schedule creation
**Setup:**
- Simulate audit service failure (e.g., CloudWatch API error)
- Admin authenticated normally

**Action:**
- POST `/api/admin/flags/test-flag-audit/schedule` with valid body

**Expected Outcome:**
- HTTP 201 Created (operation succeeds despite audit failure)
- Schedule created in database with `created_by` field
- Error logged to CloudWatch: "Audit logging failed for flag_schedule.created"
- Original operation NOT rolled back

**Evidence:**
- HTTP 201 response received
- Database query confirms schedule exists
- CloudWatch error log present (audit failure logged)
- Fire-and-forget pattern verified

---

### Error 2: Missing admin context in JWT
**Setup:**
- JWT missing `userId` or `email` claims (unexpected scenario)
- Admin endpoints still authenticated but incomplete context

**Action:**
- POST `/api/admin/flags/test-flag-audit/schedule`

**Expected Outcome:**
- HTTP 201 Created (operation proceeds)
- `created_by` field set to NULL (graceful degradation)
- Warning logged: "Admin context incomplete, created_by not populated"
- Audit event logged with partial metadata (no adminUserId)

**Evidence:**
- HTTP 201 response
- Database query: `created_by IS NULL`
- CloudWatch warning log present

---

### Error 3: Cron job failure with audit logging
**Setup:**
- Existing schedule with invalid updates (e.g., malformed JSON in `updates` field)
- Cron job processes schedule

**Action:**
- Cron job attempts to apply schedule, fails

**Expected Outcome:**
- Schedule NOT applied (flag state unchanged)
- CloudWatch audit event logged:
  - `eventType: "flag_schedule.failed"`
  - `metadata: { scheduleId, flagKey, errorMessage: "<validation error>", failedAt }`
  - Log level: ERROR

**Evidence:**
- Feature flag state unchanged
- CloudWatch Logs Insights query: Filter for `flag_schedule.failed` event with error message
- Schedule remains in pending state (not marked as applied)

---

## Edge Cases

### Edge 1: Backward compatibility - NULL admin fields
**Setup:**
- Existing schedules created BEFORE migration (all admin fields NULL)
- No audit logging for old records

**Action:**
- GET `/api/admin/flags/test-flag-audit/schedule`

**Expected Outcome:**
- HTTP 200 OK
- Response includes old schedules with:
  - `created_by: null`
  - `cancelled_by: null`
  - `cancelled_at: null`
- No errors or validation failures

**Evidence:**
- HTTP 200 response
- Response schema validation passes (all fields nullable)
- Old schedules queryable and functional

---

### Edge 2: Multiple admins create schedules for same flag
**Setup:**
- Admin A creates schedule 1 for `test-flag-audit`
- Admin B creates schedule 2 for `test-flag-audit`
- Admin C creates schedule 3 for `test-flag-audit`

**Action:**
- GET `/api/admin/flags/test-flag-audit/schedule`

**Expected Outcome:**
- HTTP 200 OK
- Response includes 3 schedules with distinct `created_by` values:
  - Schedule 1: `created_by: "admin-a"`
  - Schedule 2: `created_by: "admin-b"`
  - Schedule 3: `created_by: "admin-c"`
- Each schedule tracked independently

**Evidence:**
- Response array length = 3
- `created_by` field unique per schedule
- Database query confirms distinct creators

---

### Edge 3: Admin cancels another admin's schedule
**Setup:**
- Admin A creates schedule (created_by: "admin-a")
- Admin B authenticates and has permission to cancel schedules

**Action:**
- Admin B: DELETE `/api/admin/flags/test-flag-audit/schedule/:scheduleId`

**Expected Outcome:**
- HTTP 200 OK
- Schedule cancelled successfully
- `cancelled_by: "admin-b"` (not "admin-a")
- Audit event logged with Admin B's context

**Evidence:**
- Database query: `cancelled_by = "admin-b"`
- CloudWatch audit event: `adminUserId: "admin-b"`
- `created_by` field unchanged (still "admin-a")

---

### Edge 4: Concurrent schedule creation by same admin
**Setup:**
- Admin A initiates two schedule creations simultaneously for different flags

**Action:**
- POST `/api/admin/flags/flag-1/schedule` and `/api/admin/flags/flag-2/schedule` concurrently

**Expected Outcome:**
- Both schedules created successfully
- Both have `created_by: "admin-a"`
- Two separate audit events logged (no duplication or conflict)

**Evidence:**
- 2 schedules in database with correct `created_by`
- 2 distinct CloudWatch audit events (different scheduleIds)

---

## Required Tooling Evidence

### Backend HTTP Tests

**File:** `apps/api/lego-api/domains/config/__http__/feature-flag-scheduling.http`

**Required Requests (extend existing file):**

1. **Create schedule with admin tracking:**
   ```http
   ### Create schedule (audit logging test)
   POST http://localhost:3000/api/admin/flags/test-flag-audit/schedule
   Authorization: Bearer {{adminToken}}
   Content-Type: application/json

   {
     "scheduledAt": "2026-02-15T10:00:00Z",
     "updates": { "enabled": true }
   }

   ### Assert: Response includes created_by field
   ```

2. **Cancel schedule with admin tracking:**
   ```http
   ### Cancel schedule (audit logging test)
   DELETE http://localhost:3000/api/admin/flags/test-flag-audit/schedule/{{scheduleId}}
   Authorization: Bearer {{adminToken}}

   ### Assert: Response includes cancelled_by and cancelled_at
   ```

3. **GET schedules with admin fields:**
   ```http
   ### Get schedules (verify admin tracking fields)
   GET http://localhost:3000/api/admin/flags/test-flag-audit/schedule
   Authorization: Bearer {{adminToken}}

   ### Assert: Response includes created_by, cancelled_by, cancelled_at for each schedule
   ```

**Fields to Assert:**
- `created_by` (string or null)
- `cancelled_by` (string or null)
- `cancelled_at` (timestamp or null)
- HTTP status codes: 201 (create), 200 (cancel/get), 404 (not found)

---

### Backend Unit Tests

**Location:** `apps/api/lego-api/domains/config/application/__tests__/schedule-service.test.ts`

**Required Tests (minimum 8 new):**

1. **Test: Create schedule logs audit event with correct metadata**
   - Mock audit logger
   - Call `scheduleService.createSchedule()` with admin context
   - Assert: Audit logger called with `flag_schedule.created` event
   - Assert: Metadata includes `{ scheduleId, flagKey, scheduledAt, updates, adminUserId, adminEmail }`

2. **Test: Cancel schedule logs audit event with admin user**
   - Mock audit logger
   - Call `scheduleService.cancelSchedule()` with admin context
   - Assert: Audit logger called with `flag_schedule.cancelled` event
   - Assert: Metadata includes `{ scheduleId, flagKey, adminUserId, adminEmail, reason: "manual_cancellation" }`

3. **Test: Cron job applies schedule logs automatic event (no admin)**
   - Mock audit logger
   - Call cron job handler for pending schedule
   - Assert: Audit logger called with `flag_schedule.applied` event
   - Assert: Metadata DOES NOT include `adminUserId` or `adminEmail`

4. **Test: Cron job failure logs error event**
   - Mock audit logger and simulate database error
   - Call cron job handler for schedule
   - Assert: Audit logger called with `flag_schedule.failed` event
   - Assert: Metadata includes `{ scheduleId, flagKey, errorMessage, failedAt }`

5. **Test: Audit logging failure does not fail schedule creation**
   - Mock audit logger to throw error
   - Call `scheduleService.createSchedule()`
   - Assert: Schedule created successfully (no exception thrown)
   - Assert: Error logged to CloudWatch

6. **Test: created_by persisted to database on POST**
   - Mock database repository
   - Call `scheduleService.createSchedule()` with admin context
   - Assert: Repository insert called with `created_by: "admin-123"`

7. **Test: cancelled_by persisted to database on DELETE**
   - Mock database repository
   - Call `scheduleService.cancelSchedule()` with admin context
   - Assert: Repository update called with `cancelled_by: "admin-456"` and `cancelled_at` timestamp

8. **Test: GET response includes admin tracking fields**
   - Mock database repository to return schedules with admin fields
   - Call `scheduleService.listSchedules()`
   - Assert: Response includes `created_by`, `cancelled_by`, `cancelled_at` for each schedule

---

### Backend Integration Tests

**Approach:** Real database writes, real CloudWatch logging (no mocks for integration tests per ADR-005)

**Required Tests:**

1. **Integration: Create and cancel schedule, verify admin fields in database**
   - Setup: Start local Aurora PostgreSQL instance
   - Action: POST schedule as Admin A, DELETE schedule as Admin B
   - Assert: Query database to verify `created_by` and `cancelled_by` fields
   - Teardown: Clean up test schedules

2. **Integration: Cron job processes schedule, verify automatic event logged**
   - Setup: Insert pending schedule in database
   - Action: Trigger cron job handler
   - Assert: Schedule marked as applied, CloudWatch log contains `flag_schedule.applied` event
   - Teardown: Clean up test data

---

### CloudWatch Logs Verification

**Manual Verification Required:**

Automated assertion of CloudWatch logs is NOT required for MVP (infrastructure limitation). Manual verification steps:

1. **After running HTTP tests:**
   - Navigate to AWS CloudWatch Logs console
   - Filter log group: `/aws/lambda/lego-api-config-domain`
   - Run Logs Insights query:
     ```
     fields @timestamp, eventType, scheduleId, flagKey, adminUserId
     | filter eventType in ["flag_schedule.created", "flag_schedule.cancelled", "flag_schedule.applied", "flag_schedule.failed"]
     | sort @timestamp desc
     | limit 20
     ```

2. **Verify event structure:**
   - `flag_schedule.created`: Includes `adminUserId`, `adminEmail`, `scheduledAt`, `updates`
   - `flag_schedule.cancelled`: Includes `adminUserId`, `adminEmail`, `reason`
   - `flag_schedule.applied`: No admin fields, includes `appliedAt`, `flagState`
   - `flag_schedule.failed`: Includes `errorMessage`, `failedAt`

---

## Risks to Call Out

### Risk 1: CloudWatch Logs Verification Not Automated
**Description:** Manual verification required for audit events in CloudWatch (no automated assertion)

**Mitigation:** Document Logs Insights queries in test plan, require manual check during QA phase

**Severity:** Low (acceptable for MVP, defer automation to future story)

---

### Risk 2: JWT Claims May Not Include Admin Email
**Description:** Admin JWTs may only include `userId`, not `email` field (coordinate with auth service)

**Mitigation:** Verify JWT structure early in implementation, add email claim if missing

**Severity:** Medium (could block audit event metadata completeness)

---

### Risk 3: Fire-and-Forget Pattern Not Easily Testable
**Description:** Difficult to simulate audit service failure in unit tests (requires mocking error handling)

**Mitigation:** Use mock audit logger that throws errors, assert schedule creation still succeeds

**Severity:** Low (pattern well-established in admin domain)

---

### Risk 4: Backward Compatibility Assumption Untested Until Migration
**Description:** Cannot fully test NULL admin fields until migration applied to production data

**Mitigation:** Test with manually inserted NULL records in local database, verify GET response handles gracefully

**Severity:** Low (nullable columns ensure safety)

---

**TEST PLAN COMPLETE**
