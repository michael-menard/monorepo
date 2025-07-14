Project Detail Page

Route
/my-projects/:projectId

Overview
The Project Detail Page lets users view and manage all aspects of a single LEGO MOC project. It serves as both an editable workspace and a viewable project summary. This includes project info, attached files, inspiration images, and visibility controls.

Goals
Give users a full view of their project data
Enable inline editing of all fields and uploads
Allow attachment/removal of inspiration images
Support toggling between private and public
Prepare the project to be shared (if public)
User Stories
🧱 As a user, I can view all the project’s metadata, files, and images
✏️ As a user, I can edit the title, description, tags, and category
🖼 As a user, I can manage the thumbnail and image gallery
📁 As a user, I can upload, replace, or delete instructions and parts list files
🔗 As a user, I can attach or detach inspiration images
🔒 As a user, I can toggle the project between private and public
Sections
1. Header

Title
Project visibility toggle (public/private)
Thumbnail image
“Edit” button (optional inline editing mode)
2. Project Metadata

Editable fields:

Title
Description
Tags (multi-tag UI)
Category (dropdown or pill input)
Build Blog (rich text or markdown editor)
3. Files

Instructions
Display file name + type
Replace/delete file
Upload new (.pdf, .io, 20MB max)
Parts List
Display file name
Replace/delete file
Upload new (.csv or .xml)
4. Image Gallery

View uploaded project images
Reorder via drag-and-drop
Remove or upload more images
Pick one as the project thumbnail
5. Inspiration Images

Show thumbnails of currently linked inspiration images
“Add Inspiration” opens a picker modal from the user’s image library
Images can be:
Added or removed
Clicked to view larger
6. Related Projects

Show list of referenced project cards (if any)
Allow user to attach/detach referenced projects
Tech Considerations
Frontend:
React + RTK
Inline field editing with autosave
Dropzone for file/image upload
Drag-and-drop for images via dnd-kit
Rich text/markdown editor (react-quill, tiptap, etc.)
Backend:
Project updates via PATCH endpoints
File/image handling via pre-signed S3 URLs
Inspiration/project references stored by ID in DynamoDB
Lambda for image resizing
Access Control
Action	Visibility
View/edit	Owner only
View public project	Everyone
Edit public project	Owner only
Design Inspiration Resources
✅ Figma Community Templates

Project Overview / Dashboard UI Kits
Search “dashboard ui”
Look for cards, stats, file panels
Content Management UIs
CMS templates
Focus on file management, inline editing
Image Gallery / Upload UI
Media manager UI kits
Check for reorderable grid previews
Profile / Portfolio Pages
Project showcase templates
Good inspiration for public-facing project views
Let me know if you want a wireframe layout plan based on this PRD or help choosing one of those Figma kits to modify.


File Download Support
📁 Instructions

Display file name and type
Actions:
✅ Download (via signed S3 URL or public access if project is public)
Replace
Delete
🧾 Parts List

Display file name and type
Actions:
✅ Download
Replace
Delete
For public projects, downloads can be accessed by non-logged-in users
For private projects, only the owner can download
🔒 Security Note
Use signed URLs (time-limited) for private file downloads
Public files can optionally be served via CloudFront (if desired)


Public Download Toggle for Files

🔐 Download Controls for Public Projects
When a project is marked public, the owner has per-file control over whether attached files (instructions and parts lists) are downloadable.

⚙️ New Fields (Per File Upload)

Allow Download (boolean toggle) — default: false
📁 Instructions

Can be viewed as attached (name, type shown)
✅ Download only available if the owner enables it via the toggle
❌ If disabled, download button is hidden or grayed out for viewers
🧾 Parts List

Same toggle behavior as instructions
Download is only enabled if allowed
🔒 Ownership / Ethics Rationale
Users may upload files they do not own the rights to distribute (e.g., purchased instructions)
This toggle helps comply with Terms of Service
Backend should enforce this setting, not just rely on frontend hiding buttons
UI Consideration (For Owner)
In the file management panel:
Checkbox: “Allow public download”
Tooltip: “Only enable this if you have rights to share this file.”
UI Consideration (For Public Viewers)
If disabled:
Display text: “Downloads not available”
If enabled:
Show download button with file size/type
✅ Updated Summary of File Handling
File Type	Owner Actions	Public Viewer Actions
Instructions	Upload / Replace / Delete / Toggle Download	View name / Download (if allowed)
Parts List	Upload / Replace / Delete / Toggle Download	View name / Download (if allowed)


Download Authorization Modal for Instructions

📥 Public Download Toggle (Instructions)
When a user enables the “Allow Public Download” toggle for their instruction file:

✅ A modal confirmation dialog must appear before the toggle is activated.
❌ The toggle should not activate unless the user confirms.
🧾 Modal Content (Copy Example)
Title:

Confirm You Have Rights to Share This File
Body:

By enabling downloads, you confirm that:
You are the original creator or copyright holder of this file
You have permission to distribute it publicly
You understand that sharing copyrighted instructions without permission violates our Terms of Service
Violations may result in project removal, account suspension, or legal reporting
Buttons:

✅ “I Confirm and Accept” (activates the toggle)
❌ “Cancel” (closes modal, toggle remains off)
🛡 Enforcement Notes
Modal should only appear the first time the toggle is enabled (not every time they come back)
Server should validate that the user accepted terms when the download flag is updated
Log this confirmation in backend metadata (downloadAuthorizationAccepted: true, timestamped)
✅ UX Summary for Download Control Flow
Action	Behavior
Enable download toggle	Triggers authorization modal
Confirm ownership	Toggle turns on, file is downloadable to public
Cancel	Toggle remains off, file is not downloadable
Backend enforcement	Requires download flag and authorization confirmation
TOS violations	Flagged content may be reviewed, removed, or result in account action
