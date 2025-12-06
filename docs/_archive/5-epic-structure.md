# 5. Epic Structure

## 5.1 Epic Overview

| Order     | Epic             | App                | Dependencies | Stories |
| --------- | ---------------- | ------------------ | ------------ | ------- |
| 1         | Shell App        | `main-app`         | None         | 35      |
| 2         | Dashboard App    | `dashboard-app`    | Epic 1       | 10      |
| 3         | Gallery App      | `gallery-app`      | Epic 1       | 26      |
| 4         | Instructions App | `instructions-app` | Epic 1       | 32      |
| 5         | Wishlist App     | `wishlist-app`     | Epic 1       | 23      |
| 6         | Settings App     | `settings-app`     | Epic 1       | 17      |
| **Total** |                  |                    |              | **143** |

## 5.2 Story Sizing

| Size | Description                        | Typical Effort |
| ---- | ---------------------------------- | -------------- |
| XS   | Trivial change, single file        | < 2 hours      |
| S    | Small feature, few files           | 2-4 hours      |
| M    | Medium feature, multiple files     | 4-8 hours      |
| L    | Large feature, complex integration | 1-2 days       |

## 5.3 Story Type Indicators

| Indicator  | Meaning                                  |
| ---------- | ---------------------------------------- |
| 🖥️ FE Only | Frontend only, no backend changes needed |
| 🔄 FE+BE   | May require backend API/model changes    |

**Backend Coordination Note:** Stories marked 🔄 FE+BE should:

- Verify API endpoint exists and matches expected contract
- Coordinate backend changes first if endpoint missing/different
- Document any model/schema changes needed

---
