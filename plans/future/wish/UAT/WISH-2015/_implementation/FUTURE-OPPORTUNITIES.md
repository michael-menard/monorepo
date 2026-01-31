# Future Opportunities - WISH-2015

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | No automatic draft expiration | Low | Low | Auto-delete drafts older than 7 days (currently only ignored on restore) - improves localStorage hygiene |
| 2 | Multiple tabs overwrite scenario | Low | Medium | Add storage event listener to sync drafts across tabs in real-time - nice-to-have UX polish |
| 3 | No draft count/management UI | Low | Low | Show indicator of saved draft existence before user navigates to form - reduces surprise factor |
| 4 | localStorage full handling is silent | Low | Low | Currently shows warning; could offer to clear old drafts or compress data |
| 5 | No visual feedback during autosave | Low | Low | Subtle "Saving..." indicator or checkmark to confirm autosave is working - builds user confidence |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Cross-device draft sync via backend | Medium | High | Store drafts in database instead of localStorage for cross-device access - requires backend API endpoint |
| 2 | Draft version history | Low | High | Keep multiple draft versions with timestamps - power user feature for complex forms |
| 3 | Named draft slots | Low | Medium | Allow users to save multiple named drafts (e.g., "Star Wars set", "Castle draft") instead of single draft |
| 4 | Offline mode detection | Low | Medium | Detect offline status and inform user that draft is saved locally but not synced - improves mental model |
| 5 | Form diff visualization | Low | Medium | When resuming, show what changed since last save - helps user understand what was preserved |
| 6 | Compression for large note fields | Low | Low | Apply LZ compression to notes field in localStorage to reduce quota usage |
| 7 | Export/import draft functionality | Low | Low | Allow user to download draft as JSON and re-import later - useful for sharing or backup |
| 8 | Image thumbnail in localStorage | Low | Medium | Store tiny base64 thumbnail of uploaded image for draft preview (S3 URL may expire) |
| 9 | Analytics for draft usage | Low | Low | Track metrics: draft save rate, resume rate, abandon rate - informs product decisions |
| 10 | Extend to edit form | Medium | Medium | Apply same autosave logic to edit form (currently excluded in Non-goals) - consistent UX |

## Categories

- **Edge Cases**: Automatic expiration (#1), localStorage full handling (#4), offline mode (#4)
- **UX Polish**: Multi-tab sync (#2), draft indicator (#3), visual feedback (#5), form diff (#5), draft management UI (#3)
- **Performance**: Compression (#6), thumbnail storage (#8)
- **Observability**: Visual autosave feedback (#5), analytics (#9)
- **Integrations**: Cross-device sync (#1), offline detection (#4)
- **Power User Features**: Named draft slots (#3), version history (#2), export/import (#7)
