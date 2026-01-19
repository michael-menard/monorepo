# Prioritized Product Backlog

> **Generated:** 2025-12-28
> **Total Stories:** 193
> **Scrum Master:** Bob
> **Priority Model:** Dependency-first, then strategic value

## Priority Key

- **🔴 CRITICAL** - Blocking other work, foundational, or high business value
- **🟡 HIGH** - Important but not blocking, near-term delivery
- **🟢 MEDIUM** - Valuable but can be deferred
- **⚪ LOW** - Nice-to-have, can be scheduled flexibly

## Status Key

- **✅ Ready for Review** - Implementation complete, awaiting review
- **🚀 Approved** - Story reviewed and approved, ready to implement
- **⚙️ In Progress** - Currently being worked on
- **📝 Draft** - Story written but not yet approved
- **🔄 Needs Revision** - Requires updates based on review feedback
- **✔️ Done/Completed** - Finished and merged

---

## 🔴 CRITICAL PRIORITY - Foundation & Blockers

These stories are foundational or blocking other work. Implement in dependency order.

### Epic 3: Shared Gallery (Foundation for all galleries)

| ID | Story | Status | Dependencies | Notes |
|----|-------|--------|--------------|-------|
| **glry-1000** | Gallery Package Scaffolding | ✅ Ready for Review | None | **START HERE** - Foundation for all gallery work |
| **glry-1001a** | Generic Filter State Management | 📝 Draft | glry-1000 | **CRITICAL** - Blocks glry-1001b, glry-1001c, glry-1002, glry-1003 |
| **glry-1001b** | Filter Helper Components | 📝 Draft | glry-1000, glry-1001a | Depends on glry-1001a approval |
| **glry-1001c** | Datatable Column Filtering | 📝 Draft | glry-1000, glry-1001a, glry-1001b | Advanced filtering for datatable view |
| **glry-1002** | Multi-Column Sorting | 🔄 Needs Revision | glry-1000, glry-1001a | Blocked until glry-1001a reaches READY |
| **glry-1003** | Full-Text Search | 📝 Draft | glry-1000, glry-1001a | Lower priority, can be deferred |

**Recommended Implementation Order:**
1. glry-1000 (review and merge)
2. glry-1001a (review, revise, approve)
3. glry-1001b + glry-1002 (parallel)
4. glry-1001c
5. glry-1003 (defer to later sprint)

---

### Epic 6: Wishlist Gallery (High User Value)

| ID | Story | Status | Dependencies | Notes |
|----|-------|--------|--------------|-------|
| **wish-2000** | Database Schema & Shared Types | ✅ Ready for Review | None | **START HERE** - Blocks all wishlist work |
| **wish-2007** | Run Migration | 🚀 Approved | wish-2000 | Deploy database changes |
| **wish-2001** | Wishlist Gallery MVP | ✅ Ready for Review | wish-2000 | Core gallery functionality |
| **wish-2002** | Add Item Flow | 🚀 Approved | wish-2000, wish-2001 | User can add wishlist items |
| **wish-2004** | Modals & Transitions | 🚀 Approved | wish-2000, wish-2001 | Delete confirmation, Got It modal |
| **wish-2003** | Detail & Edit Pages | ✔️ Done | wish-2000, wish-2001 | ✅ Merged |
| **wish-2005** | UX Polish | 📝 Draft | wish-2001, wish-2002 | Drag-drop, empty states, loading |
| **wish-2006** | Accessibility Complete | 📝 Draft | wish-2001, wish-2002 | A11y improvements |

**Recommended Implementation Order:**
1. wish-2000 (review and merge)
2. wish-2007 (run migration)
3. wish-2001 (review and merge)
4. wish-2002, wish-2004 (parallel - both approved)
5. wish-2005, wish-2006 (polish layer)

---

### Epic 1: Authentication (Foundational Security)

| ID | Story | Status | Dependencies | Notes |
|----|-------|--------|--------------|-------|
| **auth-1000** | SES Email Integration | 📝 Draft | None | Replace SendGrid with AWS SES |
| **auth-1001** | SES Metrics Dashboard | 📝 Draft | auth-1000 | Monitor email delivery |

**Recommended Implementation Order:**
1. auth-1000 (plan migration from SendGrid)
2. auth-1001 (observability)

---

## 🟡 HIGH PRIORITY - Core Features

### Epic 4: MOC Instructions Gallery (Core Feature)

| ID | Story | Status | Dependencies | Notes |
|----|-------|--------|--------------|-------|
| **inst-1002** | Deploy Multipart Upload Sessions | 📝 Draft | None | Enable file uploads |
| **inst-1003** | Extract Upload Types Package | 📝 Draft | None | Shared types for uploads |
| **inst-1004** | Extract Upload Config Package | 📝 Draft | None | Shared upload configuration |
| **inst-1005** | Edit Finalize Endpoint | 📝 Draft | inst-1002 | Complete upload process |
| **inst-1006** | Edit Rate Limiting & Observability | 📝 Draft | inst-1005 | Monitor edit operations |
| **inst-1007** | S3 Cleanup Failed Edit Uploads | 📝 Draft | inst-1005 | Clean up incomplete uploads |
| **inst-1008** | Edit Routes & Entry Points | 📝 Draft | inst-1005 | UI navigation to edit |
| **inst-1009** | Edit Page & Data Fetching | 📝 Draft | inst-1008 | Edit page UI |
| **inst-1010** | Edit Form & Validation | 📝 Draft | inst-1009 | Form for editing MOCs |
| **inst-1011** | File Management UI | 📝 Draft | inst-1009 | Manage uploaded files |
| **inst-1012** | Save Flow Presign & Upload Handling | 📝 Draft | inst-1010, inst-1011 | Handle save operations |
| **inst-1013** | Cancel & Unsaved Changes Guard | 📝 Draft | inst-1012 | Prevent data loss |
| **inst-1014** | Session Persistence & Error Recovery | 📝 Draft | inst-1012 | Handle interruptions |
| **inst-1015** | Accessibility & Polish | 📝 Draft | inst-1013 | A11y improvements |
| **inst-1000** | Expiry & Interrupted Uploads | 📝 Draft | inst-1015 | Handle expired sessions |
| **inst-1001** | E2E, A11y, & Performance Tests | 📝 Draft | inst-1015 | Comprehensive testing |
| **inst-1016** | Delete - Database Schema Updates | 📝 Draft | None | Soft delete schema |
| **inst-1017** | Delete Endpoint | 📝 Draft | inst-1016 | API for soft delete |
| **inst-1018** | Restore Endpoint | 📝 Draft | inst-1016 | API for restore |
| **inst-1019** | List Deleted Endpoint | 📝 Draft | inst-1016 | Show deleted items |
| **inst-1020** | Cleanup Job | 📝 Draft | inst-1016 | Permanent deletion |
| **inst-1021** | Delete Rate Limiting & Observability | 📝 Draft | inst-1017 | Monitor delete operations |
| **inst-1022** | Delete Entry Points | 📝 Draft | inst-1017 | UI navigation |
| **inst-1023** | Delete Confirmation Modal | 📝 Draft | inst-1022 | Confirm before delete |
| **inst-1024** | Recently Deleted Section | 📝 Draft | inst-1019 | Show trash |
| **inst-1025** | Restore Flow | 📝 Draft | inst-1018, inst-1024 | Restore UI |
| **inst-1026** | Deleted MOC Detail View | 📝 Draft | inst-1024 | View deleted items |
| **inst-1027** | Delete Accessibility & Polish | 📝 Draft | inst-1025, inst-1026 | A11y improvements |
| **inst-1028** | Upload Session Test Coverage | 📝 Draft | inst-1002 | Unit tests |
| **inst-1029** | Create MOC Flow Validation | 📝 Draft | None | Validation for create flow |

**Recommended Implementation Order:**
1. **Edit Flow:** inst-1002 → inst-1003, inst-1004 → inst-1005 → inst-1006, inst-1007 → inst-1008 → inst-1009 → inst-1010 → inst-1011 → inst-1012 → inst-1013 → inst-1014 → inst-1015 → inst-1000 → inst-1001
2. **Delete Flow:** inst-1016 → inst-1017, inst-1018, inst-1019, inst-1020 → inst-1021 → inst-1022 → inst-1023 → inst-1024 → inst-1025, inst-1026 → inst-1027
3. **Testing:** inst-1028, inst-1029

---

## 🟢 MEDIUM PRIORITY - Secondary Features

### Epic 8: User Settings & Preferences

| ID | Story | Status | Dependencies | Notes |
|----|-------|--------|--------------|-------|
| **pref-1000** | Settings Scaffolding | 📝 Draft | None | **START HERE** |
| **pref-1001** | Settings API Slice | 📝 Draft | pref-1000 | RTK Query setup |
| **pref-1002** | Get Settings Endpoint | 📝 Draft | pref-1001 | Read user settings |
| **pref-1003** | Update Settings Endpoint | 📝 Draft | pref-1001 | Write user settings |
| **pref-1004** | Settings Page | 📝 Draft | pref-1002 | Settings UI shell |
| **pref-1005** | Appearance Section | 📝 Draft | pref-1004 | Theme, density settings |
| **pref-1006** | Theme Selector | 📝 Draft | pref-1005 | Light/dark theme |
| **pref-1007** | Gallery Density Selector | 📝 Draft | pref-1005 | Compact/comfortable/spacious |
| **pref-1008** | Account Section | 📝 Draft | pref-1004 | User profile settings |
| **pref-1009** | Display Name Editor | 📝 Draft | pref-1008 | Edit display name |
| **pref-1010** | Avatar Uploader | 📝 Draft | pref-1008 | Upload avatar |
| **pref-1011** | Avatar Preview | 📝 Draft | pref-1010 | Preview avatar |
| **pref-1012** | Save Settings | 📝 Draft | pref-1003 | Persist changes |
| **pref-1013** | Success Feedback | 📝 Draft | pref-1012 | Confirm save |
| **pref-1014** | Settings Loading State | 📝 Draft | pref-1004 | Loading UI |
| **pref-1015** | Settings Error Handling | 📝 Draft | pref-1004 | Error UI |
| **pref-1016** | Settings Unit Tests | 📝 Draft | pref-1012 | Test coverage |

**Recommended Implementation Order:**
1. pref-1000 → pref-1001 → pref-1002, pref-1003 (parallel)
2. pref-1004 → pref-1005, pref-1008 (parallel)
3. pref-1006, pref-1007 → pref-1009, pref-1010, pref-1011 (parallel)
4. pref-1012 → pref-1013, pref-1014, pref-1015
5. pref-1016

---

### Epic 9: Dashboard (Real-time Features)

| ID | Story | Status | Dependencies | Notes |
|----|-------|--------|--------------|-------|
| **dash-1000** | Dashboard Data Types | 📝 Draft | None | **START HERE** |
| **dash-1001** | Dashboard REST API | 📝 Draft | dash-1000 | HTTP endpoints |
| **dash-1002** | WebSocket Server Infrastructure | 📝 Draft | None | Real-time foundation |
| **dash-1003** | Dashboard UI Shell | 📝 Draft | dash-1001 | Dashboard page |
| **dash-1004** | Dashboard Cards Data Display | 📝 Draft | dash-1003 | Display stats |
| **dash-1005** | WebSocket Client Events | 📝 Draft | dash-1002 | Client connection |
| **dash-1006** | Client Resilience & Fallback | 📝 Draft | dash-1005 | Handle disconnects |
| **dash-1007** | Dashboard Integration E2E Tests | 📝 Draft | dash-1004, dash-1006 | End-to-end tests |

**Recommended Implementation Order:**
1. dash-1000, dash-1002 (parallel)
2. dash-1001 → dash-1003 → dash-1004
3. dash-1005 → dash-1006
4. dash-1007

---

### Epic 5: Inspiration Gallery (33 stories - deferred)

All 33 inspiration gallery stories are in **Draft** status. Recommend deferring to future sprint.

### Epic 7: Sets Gallery (33 stories - deferred)

All 33 sets gallery stories are in **Draft** status. Recommend deferring to future sprint.

---

## ⚪ LOW PRIORITY - Housekeeping & Launch Prep

### Epic 0: Housekeeping (Technical Debt & Infrastructure)

| ID | Story | Status | Dependencies | Notes |
|----|-------|--------|--------------|-------|
| **hskp-2007** | Fix Redis Dependency Wishlist | 🚀 Approved | None | Bug fix |
| **hskp-2008** | Consolidate Wishlist Schemas | 🚀 Approved | None | Code cleanup |
| **hskp-2009** | Wishlist Handler Tests | 🚀 Approved | None | Test coverage |
| **hskp-1000** | Auth E2E Test Suite | 🚀 Approved | None | Test coverage |
| **hskp-1001** | Forgot Password Tests | 🚀 Approved | None | Test coverage |
| **hskp-1002** | Reset Password Tests | 🚀 Approved | None | Test coverage |
| **hskp-1003** | Bug: Login Form Not Submitting in E2E Tests | ✔️ Fixed | None | ✅ Fixed |
| **hskp-2000** | API Service Extraction | 📝 Draft | None | Architecture refactor |
| **hskp-2001** | Express Local Development | 📝 Draft | hskp-2000 | Dev environment |
| **hskp-2002** | MCP Server Infrastructure | 📝 Draft | None | Tool integration |
| **hskp-2003** | Drizzle MCP Server | 📝 Draft | hskp-2002 | Database tools |
| **hskp-2004** | Serverless MCP Server | 📝 Draft | hskp-2002 | Serverless tools |
| **hskp-2005** | Scaffold Endpoint Skill | 📝 Draft | None | Code generation |
| **hskp-2006** | Scaffold Feature Skill | 📝 Draft | None | Code generation |

**Recommended Implementation Order:**
1. **Approved Bugs & Tests:** hskp-2007, hskp-2008, hskp-2009, hskp-1000, hskp-1001, hskp-1002 (can be done in parallel as filler work)
2. **Infrastructure (optional):** hskp-2000 → hskp-2001, hskp-2002 → hskp-2003, hskp-2004, hskp-2005, hskp-2006

---

### Epic 0: Launch Readiness (Documentation - 53 stories)

All 53 launch readiness stories are in **Draft** status. These are documentation tasks (READMEs, runbooks, playbooks) that can be written anytime before launch. Recommend deferring to pre-launch sprint.

**Categories:**
- **Package READMEs (lnch-1000 to lnch-1008):** 9 stories
- **Runbooks (lnch-1009 to lnch-1023):** 15 stories
- **Operational Docs (lnch-1024 to lnch-1063):** 40 stories

---

## Sprint Planning Recommendations

### Sprint 1: Gallery Foundation (2 weeks)

**Goal:** Establish shared gallery infrastructure

**Stories (6):**
1. glry-1000 (review + merge)
2. glry-1001a (review + revise + approve + implement)
3. glry-1001b (implement)
4. glry-1002 (revise + implement)
5. wish-2000 (review + merge)
6. wish-2007 (run migration)

**Capacity:** 6 stories (1 foundation, 4 gallery infra, 1 migration)

---

### Sprint 2: Wishlist Gallery MVP (2 weeks)

**Goal:** Ship wishlist gallery to users

**Stories (5):**
1. wish-2001 (review + merge)
2. wish-2002 (implement - already approved)
3. wish-2004 (implement - already approved)
4. glry-1001c (implement)
5. Filler: hskp-2007, hskp-2008, hskp-2009 (approved test stories)

**Capacity:** 5 stories (1 review, 2 approved, 1 new, 3 filler)

---

### Sprint 3: Wishlist Polish + Instructions Start (2 weeks)

**Goal:** Polish wishlist, start instructions edit flow

**Stories (8):**
1. wish-2005 (UX polish)
2. wish-2006 (accessibility)
3. inst-1002 (deploy upload sessions)
4. inst-1003 (upload types package)
5. inst-1004 (upload config package)
6. inst-1005 (edit finalize endpoint)
7. inst-1028 (upload test coverage)
8. Filler: hskp-1000, hskp-1001, hskp-1002 (auth tests)

**Capacity:** 8 stories (2 polish, 4 instructions foundation, 1 test, 3 filler)

---

### Future Sprints

- **Sprint 4-6:** Complete Instructions Edit Flow (inst-1006 through inst-1015)
- **Sprint 7-8:** Instructions Delete Flow (inst-1016 through inst-1027)
- **Sprint 9-10:** User Settings (pref-1000 through pref-1016)
- **Sprint 11-12:** Dashboard Real-time (dash-1000 through dash-1007)
- **Sprint 13-14:** Authentication SES Migration (auth-1000, auth-1001)
- **Sprint 15+:** Inspiration Gallery, Sets Gallery, Launch Readiness Docs

---

## Notes

- **Total Active Stories:** 193
- **Ready to Start:** 29 Approved stories + 11 Ready for Review = 40 stories can begin immediately
- **Blocked:** glry-1001b, glry-1001c, glry-1002 blocked on glry-1001a
- **High-Priority Path:** Gallery Foundation → Wishlist MVP → Instructions Edit → Settings → Dashboard
- **Deferred:** Inspiration (22 stories), Sets (33 stories), Launch Docs (53 stories) = 108 stories (56%)

**Scrum Master Recommendation:** Focus first 6 sprints on Gallery + Wishlist + Instructions. This delivers maximum user value with clear dependencies. Settings and Dashboard can follow once core galleries proven. Save Inspiration/Sets/Launch Docs for later.

---

**Last Updated:** 2025-12-28 by Bob (Scrum Master)
