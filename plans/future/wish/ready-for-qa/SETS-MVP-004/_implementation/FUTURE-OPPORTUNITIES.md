# Future Opportunities - SETS-MVP-004

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Optimistic update implementation detail | Low | Low | Story says "UI updates immediately" (AC12) but doesn't specify if using React Query, SWR, local state, or cache mutation. Document preferred pattern for consistency across features. |
| 2 | Animation motion preferences handling | Low | Low | AC17 mentions `prefers-reduced-motion` but doesn't specify fallback behavior. Should celebration show static checkmark icon? No animation at all? Document UX fallback. |
| 3 | Toast duration not specified | Low | Low | AC18 shows toast but doesn't specify duration. How long does user have to undo? Standard 5s window or custom duration? |
| 4 | Network retry strategy | Medium | Medium | AC13 handles error revert but doesn't specify retry behavior. Should failed toggle automatically retry? Show retry button? Or just fail and revert? |
| 5 | Concurrent toggle prevention | Low | Medium | What happens if user rapidly clicks toggle before API responds? Should component disable during request? Queue requests? Ignore subsequent clicks? |
| 6 | Keyboard focus management | Low | Low | AC7 says keyboard accessible but doesn't specify focus behavior after toggle. Should focus remain on toggle? Move to undo button in toast? |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Build date tracking | Medium | Low | When user marks set as "Built", capture build completion date. Useful for "Time to Build" analytics and personal achievement tracking. Add `buildCompletedAt` timestamp field. |
| 2 | Build time estimation | Low | Medium | Track time from purchase to built status. Show "You built this in X days/months" in celebration. Requires purchaseDate from SETS-MVP-001 and buildCompletedAt timestamp. |
| 3 | Build notes/journal | Medium | High | Allow users to add notes when marking as built: "Built with my kid", "Challenging build, took 8 hours", etc. Adds sentimental value and searchable content. |
| 4 | Batch build status update | High | Medium | Power users with large collections may want "Mark all as built" or "Mark selected as built". Requires multi-select UI and batch API endpoint. |
| 5 | Build status history | Low | High | Track build/unbuild events over time. Some users rebuild sets or display then disassemble. Audit trail of status changes with timestamps. |
| 6 | Social sharing of builds | Medium | High | "I just built LEGO Set 75192!" social share button in celebration animation. Generates user content and community engagement. |
| 7 | Build photo attachment | High | High | Allow photo upload when marking as built. Showcase completed builds in collection view. Requires image upload flow and storage. |
| 8 | Celebration animation customization | Low | Medium | Let users choose celebration style: confetti, checkmark pulse, LEGO brick animation, or none. User preference saved in profile. |
| 9 | Sound effects on toggle | Low | Low | Satisfying click sound or completion chime. Must respect user audio preferences and accessibility. |
| 10 | Build progress tracking | High | High | Support "partially built" status beyond in_pieces/built binary. Track % completion or instruction step number. Major feature for builders. |
| 11 | Undo toast persistence | Medium | Medium | AC19 shows undo in toast but toast disappears after timeout. Consider persistent undo (activity log/history page) for longer window. |
| 12 | Offline support | Medium | High | Queue toggle actions when offline, sync when online. Requires offline storage and sync strategy. |

## Categories

### Edge Cases
- Concurrent toggle clicks (rapid clicking)
- Network retry on failure
- Offline toggle queueing
- Build status history conflicts

### UX Polish
- Build date capture and display
- Build time estimation and celebration
- Build notes/journal
- Celebration animation customization
- Sound effects
- Social sharing

### Performance
- Optimistic update caching strategy
- Batch operations for power users
- Image upload optimization (build photos)

### Observability
- Analytics: toggle frequency, built vs in_pieces ratio
- User engagement: celebration animation effectiveness
- Error tracking: toggle failure rate by error type

### Integrations
- Social media sharing (build announcements)
- Calendar integration (build completion events)
- Achievement system (builds completed milestones)
- Build photo gallery integration

### Accessibility
- Screen reader announcements for state changes
- Keyboard focus management strategy
- High contrast mode for toggle states
- Reduced motion fallback for celebrations
