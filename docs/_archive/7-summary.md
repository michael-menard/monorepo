# 7. Summary

## 7.1 Total Effort

| Epic      | App          | Stories | XS     | S       | M      | FE Only | FE+BE  |
| --------- | ------------ | ------- | ------ | ------- | ------ | ------- | ------ |
| 1         | Shell        | 35      | 7      | 25      | 3      | 33      | 2      |
| 2         | Dashboard    | 10      | 3      | 7       | 0      | 6       | 4      |
| 3         | Gallery      | 26      | 6      | 17      | 3      | 21      | 5      |
| 4         | Instructions | 32      | 2      | 26      | 4      | 22      | 10     |
| 5         | Wishlist     | 23      | 8      | 15      | 0      | 17      | 6      |
| 6         | Settings     | 17      | 7      | 10      | 0      | 13      | 4      |
| **Total** |              | **143** | **33** | **100** | **10** | **112** | **31** |

## 7.2 Implementation Order

1. **Epic 1 (Shell)** - Must complete first; establishes foundation
2. **Epic 2 (Dashboard)** - Validates shell integration pattern
3. **Epics 3-6** - Can be built in any order after shell
   - Recommended: Gallery → Instructions → Wishlist → Settings

## 7.3 Risk Areas

| Risk                        | Stories Affected        | Mitigation                                            |
| --------------------------- | ----------------------- | ----------------------------------------------------- |
| TanStack Router integration | 1.18, 1.19, 1.26, 1.33  | Build shell router first, validate before domain apps |
| RTK Query slice injection   | 2.2, 3.2, 4.2, 5.2, 6.2 | Follow official docs, test with Dashboard first       |
| File upload complexity      | 4.6, 4.12, 4.21-4.23    | Use established patterns, thorough error handling     |
| Backend API gaps            | All 🔄 FE+BE stories    | Verify endpoints early, coordinate changes            |

## 7.4 Success Criteria

- [ ] All 6 apps build and run successfully
- [ ] 100% compliance with `.bmad-coding-style.md`
- [ ] ≥45% test coverage per app
- [ ] All functional requirements (FR1-FR92) implemented
- [ ] WCAG 2.1 AA accessibility compliance
- [ ] Mobile and desktop parity
- [ ] Existing functionality preserved

---
