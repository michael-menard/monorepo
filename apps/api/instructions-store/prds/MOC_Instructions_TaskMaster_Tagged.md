### 📘 MOC Instructions Library – TaskMaster PRD

#### 🧩 Overview

A new `MocInstructionsLibrary` feature for the Lego Projects App. This lets users upload and organize their own instruction files (PDF or Stud.io), associate them with parts lists, images, and metadata, and then search/browse them through a dedicated UI.

---

#### ✅ Objectives

- Allow users to upload and manage their own MOC instruction files @frontend @backend
- Support thumbnails, tags, and descriptions for each MOC @frontend @backend
- Let users associate gallery images or upload custom images @frontend @backend
- Attach multiple downloadable parts lists @frontend @backend
- Reuse existing gallery and file upload components @frontend
- Ensure user-specific visibility and IP-respecting access control @backend
- Use Elasticsearch to support full-text search on all metadata @backend @infra

---

#### 📁 Feature Groups

##### 📂 1. Instructions Gallery (`<MocInstructionsGallery />`)

- [ ] Reuse `<InspirationGallery />` masonry-style layout @frontend
- [ ] Filter/search via Elasticsearch on title, tags, description @frontend @backend @infra
- [ ] Display hover drawer using Framer Motion @frontend
- [ ] Show empty state if user has no uploaded MOCs @frontend

##### 📂 2. MOC Detail Page (`<MocDetailPage />`)

- [ ] Editable form: title, description, tags @frontend @backend
- [ ] Upload thumbnail (optional) @frontend @backend
- [ ] Upload single instruction file (`.pdf` or `.io`) @frontend @backend
- [ ] Upload one or more parts list files (`.csv`, `.json`) @frontend @backend
- [ ] Display downloadable file links (no previews) @frontend @backend
- [ ] Allow removal of any attached file @frontend @backend
- [ ] Upload or select related gallery images (as references) @frontend @backend
- [ ] Show image descriptions if present in gallery metadata @frontend

##### 📂 3. File Upload Handling (`<FileUpload />`)

- [ ] Accept different file types based on context @frontend @backend
  - [ ] `.pdf`, `.io` → Instruction upload
  - [ ] `.csv`, `.json` → Parts list upload
  - [ ] `.jpg`, `.png`, `.heic` → Gallery/thumbnail images
- [ ] Support drag-and-drop for all file types @frontend

---

#### 🔒 Permissions & Moderation

- [ ] Uploaded MOCs are only visible to the owner @backend
- [ ] No sharing or public views allowed @backend
- [ ] Owner can edit/delete their own content @frontend @backend
- [ ] No flagging/mod tools needed at this time

---

#### ⚙️ Technical Details

- **Routing**: `/userId/mocs` and `/userId/mocs/:mocId` @frontend
- **Monorepo Path**: `apps/lego/pages/:userId/mocs/:mocId` @frontend
- **UI Stack**: React, Tailwind CSS, ShadCN UI, Framer Motion @frontend
- **Data Storage**:
  - Metadata in PostgreSQL @backend
  - Files in Amazon S3 (scoped by user) @infra
  - Indexed metadata in Elasticsearch @infra
- **Image Linking**: Referenced from inspiration gallery (not copied) @backend
- **SSR**: Not required
- **Accessibility**: WCAG-compliant @frontend

---

#### 🚀 Stretch Goals

- [ ] CSV/JSON parts list preview table @frontend @backend
- [ ] Image-specific annotations or notes @frontend
- [ ] MOC sharing (opt-in/public toggle) @frontend @backend
- [ ] Version history for instruction files @backend

---

#### 🧪 Test Cases

- [ ] Upload a valid PDF instruction file and confirm metadata is saved correctly
- [ ] Upload a valid `.io` file and verify that only one instruction is allowed per MOC
- [ ] Upload multiple parts list files (`.csv`, `.json`) and verify download links work
- [ ] Search for a MOC using keywords in title and tags and confirm results accuracy
- [ ] Edit metadata and ensure updates reflect correctly in the gallery and detail page
- [ ] Select an image from the Inspiration Gallery and ensure it displays in the MOC detail
- [ ] Remove a file and confirm it no longer appears in UI or downloads
- [ ] Attempt to access another user’s MOC and confirm access is denied

---

#### ⚠️ Edge Cases

- [ ] Uploading a second instruction file should reject the upload or replace the previous one
- [ ] Uploading an unsupported file type should show a validation error
- [ ] Removing all files should not break the gallery layout
- [ ] Searching with no matching results should trigger the empty state UI
- [ ] Drag-and-drop invalid file types should be blocked or rejected gracefully
- [ ] Large files should upload with progress indication and fail gracefully if too big
