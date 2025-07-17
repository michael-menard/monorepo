
# 📄 Profile Page Package – PRD

## 1. Overview

A reusable `ProfilePage` component built for a **Turborepo monorepo** structure, intended to support **multiple apps** with a consistent layout. The package lives in the `packages` directory and leverages **Tailwind CSS**, **ShadCN UI components**, and **a shared design system**.

This page will serve dual purposes:
- **Authenticated user dashboard**: A landing page showing personal profile details and access to modules.
- **Public user profile**: A sharable or viewable page displaying user-specific information for others.

---

## 2. Objectives

- Provide a standardized layout with a consistent user avatar and basic info.
- Allow custom content injection via slots/children for app-specific modules.
- Enable avatar image upload, editing, and cropping.
- Maintain accessibility and responsive design.
- Ensure the profile layout and components are portable across apps.

---

## 3. Features & Functional Specs

### 3.1. ProfilePage Component

| Feature            | Description                                                                 |
|--------------------|-----------------------------------------------------------------------------|
| **Layout**         | Two-column layout: avatar + user info on the left, custom content on right. Responsive. |
| **Customization**  | Apps wrap content inside `<ProfilePage>{children}</ProfilePage>`            |
| **Theme Support**  | Uses global Tailwind theme from shared config                               |
| **Skeleton States**| Built-in skeletons for avatar, name, and main content area                  |
| **Accessibility**  | Passes axe-core audits with semantic HTML + ARIA                           |

---

### 3.2. Layout Components

These components should be exported individually from the package:

- `ProfileSidebar` – Renders avatar, name, username, bio, and stats
- `ProfileMain` – Slot for app-specific profile content
- `ProfileSkeleton` – Full layout skeleton placeholder

---

### 3.3. Avatar & Upload

| Feature             | Description                                                                 |
|---------------------|-----------------------------------------------------------------------------|
| **AvatarUploader**  | Optional. Wraps shared `FileUpload` with avatar logic                       |
| **Editing Modal**   | Cropping/zooming/centering using [`react-easy-crop`](https://www.npmjs.com/package/react-easy-crop) in ShadCN modal |
| **Fallback**        | Displays placeholder avatar if none is provided                            |
| **Drag & Drop**     | Supported via existing `FileUpload` integration                             |
| **Accepted Formats**| `.jpg` and `.heic` only                                                     |
| **UI**              | Modal-based editing flow using ShadCN Dialog                               |

---

## 4. Technical Considerations

| Area                | Detail                                                                      |
|---------------------|-----------------------------------------------------------------------------|
| **Monorepo Path**   | `packages/profile`                                                          |
| **UI Libraries**    | React, Tailwind CSS, ShadCN                                                 |
| **Data Fetching**   | RTK Query support; component remains data-source agnostic                   |
| **Props vs Context**| Initial version uses props; extensible to context or hooks                  |
| **SSR**             | Not required in current implementation                                      |

---

## 5. Stretch Goals / Future Enhancements

- Theming via Tailwind tokens passed as props
- Inline editable profile fields (bio, name, etc.)
- i18n support via `react-i18next` or `next-intl`
- `useProfileData()` hook for standard data hydration

---

## 6. Deliverables

- [ ] `<ProfilePage />` layout component
- [ ] `<ProfileSidebar />` and `<ProfileMain />`
- [ ] `<AvatarUploader />` with cropping/editing modal
- [ ] `<ProfileSkeleton />`
- [ ] TypeScript support
- [ ] Tailwind + ShadCN compatibility
- [ ] Example implementation in `/apps/demo`

---

## 📌 Tags

```
#profile #reusable-ui #tailwind #shadcn #avatar-upload #monorepo #turborepo #component-library #typescript #responsive #accessibility
```

---

## ✅ Test Cases

| Case # | Description                                                           | Expected Result |
|--------|-----------------------------------------------------------------------|-----------------|
| TC01   | Render `ProfilePage` with children content                            | Layout renders properly with injected content |
| TC02   | Upload `.jpg` avatar                                                  | Modal opens, image is displayed and editable |
| TC03   | Upload `.heic` avatar                                                 | Modal opens, image is displayed and editable |
| TC04   | Upload unsupported file format (e.g. `.png`, `.gif`)                  | Error message shown, file rejected |
| TC05   | No avatar provided                                                    | Placeholder avatar is rendered |
| TC06   | Avatar uploaded and edited (crop/zoom/center)                         | Cropped avatar saved and rendered correctly |
| TC07   | Resize browser to mobile breakpoint                                   | Layout stacks vertically |
| TC08   | Press Tab key to navigate through profile fields                      | All interactive elements are focusable |
| TC09   | Profile page shows skeleton state while loading                       | Skeleton components appear properly |
| TC10   | Pass custom Tailwind theme                                             | Component colors and spacing adjust accordingly |

---

## ⚠️ Edge Cases

| Scenario                                                              | Handling Strategy |
|-----------------------------------------------------------------------|-------------------|
| User uploads very large image (e.g. 10MB+)                            | Show loader, compress or reject if too large |
| Image fails to load in cropping tool                                  | Show fallback message and allow retry |
| `children` passed to `ProfilePage` are `null` or `undefined`          | Gracefully render empty state with fallback UI |
| Cropping tool modal is opened but the user closes the browser         | No partial save; state cleanup handled on unmount |
| Drag-and-drop file fails silently on mobile                           | Fallback to manual file picker |
| Multiple apps load different Tailwind configs                         | Component pulls styling from global Tailwind via shared config pattern |
