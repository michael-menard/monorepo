# Story ID Mapping Reference

This document maps old story IDs to the new naming scheme implemented on 2025-12-26.

## Naming Convention

**New Format:** `{prefix}-{number}-{slug}.md`
- `prefix`: 4-letter epic code (hskp, auth, dash, glry, inst, insp, wish, sets, pref)
- `number`: Sequential from 1000 within each epic
- `slug`: Descriptive name from original story

## Epic Mapping

| New Epic | Old Epic | Prefix | Description |
|----------|----------|--------|-------------|
| 0 | 0.x | hskp | Housekeeping |
| 1 | 1.x | auth | Auth/Foundation |
| 2 | 7.x | dash | Dashboard |
| 3 | 3.0.x | glry | Shared Gallery |
| 4 | 3.1.x | inst | Instructions |
| 5 | 3.2.x | insp | Inspiration |
| 6 | 3.3.x | wish | Wishlist |
| 7 | 3.4.x | sets | Sets |
| 8 | 6.x | pref | Settings/Preferences |

## Complete Story ID Mapping

### Epic 0 - Housekeeping (hskp)
| Old ID | New ID | Filename |
|--------|--------|----------|
| 0.2.0 | hskp-1000 | hskp-1000-auth-e2e-test-suite.md |
| 0.2.1 | hskp-1001 | hskp-1001-forgot-password-tests.md |
| 0.2.2 | hskp-1002 | hskp-1002-reset-password-tests.md |
| bug.* | hskp-1003 | hskp-1003-bug-login-form-not-submitting-in-e2e-tests.md |

### Epic 1 - Auth (auth)
| Old ID | New ID | Filename |
|--------|--------|----------|
| 1.13.9 | auth-1000 | auth-1000-ses-email-integration.md |
| 1.13.10 | auth-1001 | auth-1001-ses-metrics-dashboard.md |

### Epic 2 - Dashboard (dash) [was Epic 7]
| Old ID | New ID | Filename |
|--------|--------|----------|
| 7.1 | dash-1000 | dash-1000-dashboard-data-types.md |
| 7.2 | dash-1001 | dash-1001-dashboard-rest-api.md |
| 7.3 | dash-1002 | dash-1002-websocket-server-infrastructure.md |
| 7.4 | dash-1003 | dash-1003-dashboard-ui-shell.md |
| 7.5 | dash-1004 | dash-1004-dashboard-cards-data-display.md |
| 7.6 | dash-1005 | dash-1005-websocket-client-events.md |
| 7.7 | dash-1006 | dash-1006-client-resilience-fallback.md |
| 7.8 | dash-1007 | dash-1007-dashboard-integration-e2e-tests.md |

### Epic 3 - Shared Gallery (glry) [was 3.0.x]
| Old ID | New ID | Filename |
|--------|--------|----------|
| 3.0.1 | glry-1000 | glry-1000-gallery-package-scaffolding.md |

### Epic 4 - Instructions (inst) [was 3.1.x]
| Old ID | New ID | Filename |
|--------|--------|----------|
| 3.1.24 | inst-1000 | inst-1000-expiry-and-interrupted-uploads.md |
| 3.1.26 | inst-1001 | inst-1001-e2e-a11y-perf.md |
| 3.1.27 | inst-1002 | inst-1002-deploy-multipart-upload-sessions.md |
| 3.1.29 | inst-1003 | inst-1003-extract-upload-types-package.md |
| 3.1.30 | inst-1004 | inst-1004-extract-upload-config-package.md |
| 3.1.36 | inst-1005 | inst-1005-edit-finalize-endpoint.md |
| 3.1.37 | inst-1006 | inst-1006-edit-rate-limiting-observability.md |
| 3.1.38 | inst-1007 | inst-1007-s3-cleanup-failed-edit-uploads.md |
| 3.1.39 | inst-1008 | inst-1008-edit-routes-and-entry-points.md |
| 3.1.40 | inst-1009 | inst-1009-edit-page-and-data-fetching.md |
| 3.1.41 | inst-1010 | inst-1010-edit-form-and-validation.md |
| 3.1.42 | inst-1011 | inst-1011-file-management-ui.md |
| 3.1.43 | inst-1012 | inst-1012-save-flow-presign-upload-handling.md |
| 3.1.44 | inst-1013 | inst-1013-cancel-unsaved-changes-guard.md |
| 3.1.45 | inst-1014 | inst-1014-session-persistence-error-recovery.md |
| 3.1.46 | inst-1015 | inst-1015-accessibility-and-polish.md |
| 3.1.47 | inst-1016 | inst-1016-delete-database-schema-updates.md |
| 3.1.48 | inst-1017 | inst-1017-delete-endpoint.md |
| 3.1.49 | inst-1018 | inst-1018-restore-endpoint.md |
| 3.1.50 | inst-1019 | inst-1019-list-deleted-endpoint.md |
| 3.1.51 | inst-1020 | inst-1020-cleanup-job.md |
| 3.1.52 | inst-1021 | inst-1021-delete-rate-limiting-observability.md |
| 3.1.53 | inst-1022 | inst-1022-delete-entry-points.md |
| 3.1.54 | inst-1023 | inst-1023-delete-confirmation-modal.md |
| 3.1.55 | inst-1024 | inst-1024-recently-deleted-section.md |
| 3.1.56 | inst-1025 | inst-1025-restore-flow.md |
| 3.1.57 | inst-1026 | inst-1026-deleted-moc-detail-view.md |
| 3.1.58 | inst-1027 | inst-1027-delete-accessibility-polish.md |
| 3.1.59 | inst-1028 | inst-1028-upload-session-test-coverage.md |
| 3.1.60 | inst-1029 | inst-1029-create-moc-flow-validation.md |

### Epic 5 - Inspiration (insp) [was 3.2.x]
| Old ID | New ID | Filename |
|--------|--------|----------|
| 3.2.1 | insp-1000 | insp-1000-inspiration-gallery-scaffolding.md |
| 3.2.2 | insp-1001 | insp-1001-inspiration-card-component.md |
| 3.2.3 | insp-1002 | insp-1002-inspiration-api-endpoints.md |
| 3.2.4 | insp-1003 | insp-1003-inspiration-upload-page.md |
| 3.2.5 | insp-1004 | insp-1004-inspiration-collection-management.md |
| 3.2.6 | insp-1005 | insp-1005-inspiration-link-to-moc.md |

### Epic 6 - Wishlist (wish) [was 3.3.x]
| Old ID | New ID | Filename |
|--------|--------|----------|
| 3.3.1 | wish-1000 | wish-1000-wishlist-gallery-scaffolding.md |
| 3.3.2 | wish-1001 | wish-1001-wishlist-card-component.md |
| 3.3.3 | wish-1002 | wish-1002-wishlist-api-endpoints.md |
| 3.3.4 | wish-1003 | wish-1003-wishlist-add-item-page.md |

### Epic 7 - Sets (sets) [was 3.4.x]
| Old ID | New ID | Filename |
|--------|--------|----------|
| 3.4.1 | sets-1000 | sets-1000-sets-gallery-scaffolding.md |
| 3.4.2 | sets-1001 | sets-1001-sets-card-component.md |
| 3.4.3 | sets-1002 | sets-1002-sets-api-endpoints.md |
| 3.4.4 | sets-1003 | sets-1003-sets-detail-page.md |
| 3.4.5 | sets-1004 | sets-1004-sets-add-page.md |

### Epic 8 - Settings (pref) [was 6.x]
| Old ID | New ID | Filename |
|--------|--------|----------|
| 6.1 | pref-1000 | pref-1000-settings-scaffolding.md |
| 6.2 | pref-1001 | pref-1001-settings-api-slice.md |
| 6.3 | pref-1002 | pref-1002-get-settings-endpoint.md |
| 6.4 | pref-1003 | pref-1003-update-settings-endpoint.md |
| 6.5 | pref-1004 | pref-1004-settings-page.md |
| 6.6 | pref-1005 | pref-1005-appearance-section.md |
| 6.7 | pref-1006 | pref-1006-theme-selector.md |
| 6.8 | pref-1007 | pref-1007-gallery-density-selector.md |
| 6.9 | pref-1008 | pref-1008-account-section.md |
| 6.10 | pref-1009 | pref-1009-display-name-editor.md |
| 6.11 | pref-1010 | pref-1010-avatar-uploader.md |
| 6.12 | pref-1011 | pref-1011-avatar-preview.md |
| 6.13 | pref-1012 | pref-1012-save-settings.md |
| 6.14 | pref-1013 | pref-1013-success-feedback.md |
| 6.15 | pref-1014 | pref-1014-settings-loading-state.md |
| 6.16 | pref-1015 | pref-1015-settings-error-handling.md |
| 6.17 | pref-1016 | pref-1016-settings-unit-tests.md |

---
*Generated: 2025-12-26*
