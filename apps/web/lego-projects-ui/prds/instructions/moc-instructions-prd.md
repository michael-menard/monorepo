Projects (MOCs)

Overview
Users manage all of their LEGO MOCs from a single index page. This page is a searchable, filterable, infinite-scrolling gallery of all their personal projects. Clicking on a project opens its detailed view. All project creation and navigation starts from here.

Primary Page
/my-projects

This is the Projects module. There is no separate dashboard or project hub.

Features
🖼 Projects Gallery

Infinite scroll of all the user’s projects
Responsive grid layout
Each card shows:
Thumbnail (fallback if none)
Title
Last updated timestamp
Lock icon if private
🆕 Add Project

“Add Project” button (floating or pinned top right)
Opens a modal or navigates to a new project form
Minimum required: title + description
🔍 Search & Filtering

Search bar (full-text, powered by OpenSearch)
Filters:
Category
Has Instructions
Has Parts List
Public/Private toggle
👆 Project Click

Clicking a project card opens the detail page
Route: /my-projects/:projectId
Allows view/edit of metadata, files, and linked content
Project Data Model
Field	Required	Notes
Title	✅	Always required
Description	✅	Markdown or rich text
Category	⛔	Tag or string
Build Blog	⛔	Optional longform log
Thumbnail	⛔	JPG, PNG, HEIC
Tags	⛔	Array of strings
Inspiration Images	⛔	Linked by ID (many-to-many)
Instructions	⛔	PDF or .io
Parts List	⛔	CSV or BrickLink XML
IsPublic	✅	Defaults to false
Referenced Projects	⛔	Array of project IDs
Access Rules
/my-projects: requires login (Clerk gated)
Each user only sees their own projects here
Clicking into a project checks access rights (owner or public)
Tech Stack
Frontend
React + RTK Query
Tailwind + ShadCN + Framer Motion
react-infinite-scroll-component or IntersectionObserver for scroll
Backend
DynamoDB for project storage
S3 for file + image storage
Elasticsearch for full-text and filtered search
Lambda for upload and metadata processing
✅ Summary
The Projects Module = /my-projects
It's a gallery-first, search-first interface
Add/edit, browse, search, and access all happen from this one page
