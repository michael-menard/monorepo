Add Project Flow (Multi-Step)

Route
/my-projects/new

Overview
This is a 3-step flow to create a new project (MOC). Each step updates the backend in real-time. Files are associated with the project as soon as it's created (after step 1). A stepper UI at the top helps track progress.

🧭 Step Structure
Step 1: Project Details

Fields:

Title (required)
Description (required)
Tags (optional, comma-separated or chips)
Category (optional dropdown or chips)
✅ On “Next”:

Creates a new project in DynamoDB
Stores values locally in state (form stays populated if user goes back)
Returns a projectId used for uploads
Step 2: Upload Instructions

Accepts .pdf and .io files (20MB max)
Validates file type and size on select
Upload begins immediately on file select
Display upload progress bar
Allow deletion before continuing
Show file metadata (type, size, uploaded time)
🔘 This step is skippable

“Skip” or “Next” button continues to next step
Skipped = no file attached
Step 3: Upload Images

Accepts multiple image uploads (.jpg, .png, .heic)
20MB per image max
Upload begins on file select
Images are displayed as thumbnails in a drag-and-drop sortable grid
Allow users to:
Reorder via drag
Remove any image
🖼 If no thumbnail is selected:

Use first image as fallback
If no images uploaded, fall back to a default UI graphic
✅ Completion
At end of step 3:

Button: “Finish & View Project”
Redirects to /my-projects/:projectId
🧠 Data Handling
All text inputs stored in React state
File uploads trigger real-time S3 upload + project update via API
When navigating backward, form fields remain populated
📦 Backend Integration
Action	Trigger	Notes
Create project	Step 1 complete	Returns projectId
Upload instruction	Step 2	Linked to projectId in metadata
Upload image	Step 3	Each image tagged with projectId + sort order
Reorder/delete images	Step 3	Updates sort metadata or deletes from S3
🧰 Tech Stack
Frontend:
React + RTK
Tailwind + ShadCN for inputs
react-beautiful-dnd or dnd-kit for image sorting
File previews with browser APIs
State managed locally per step, submitted via API
Backend:
S3 for files/images
DynamoDB for project + file metadata
Lambda for file processing/validation (optional)
🛑 Exit Behavior
Since project is created at Step 1:
If the user exits midway, the project exists with partial data
Consider surfacing these “incomplete” projects in /my-projects (tagged as "incomplete" or "missing files")
Optional: prompt user “Are you sure you want to leave?” if they exit before step 3

Image Upload Step (Step 3) + Backend Processing

🖼️ Image Upload Behavior (Frontend)
Users can upload multiple images (.jpg, .png, .heic)
Each image is validated client-side before upload:
Max 20MB
Correct file type
Images display in a drag-and-drop grid
Each image can be:
Reordered
Removed
First uploaded image becomes default thumbnail if none selected manually
🧠 New Backend Flow: Image Resizing via Lambda Trigger
🔁 On successful upload to S3:

Trigger an S3 event → invokes Lambda function:

Lambda reads original image
Creates resized variants:
thumbnail → e.g. 150x150
small → e.g. 800px wide
fullscreen → up to 1920px wide
Only creates sizes equal to or smaller than the original
No interpolation (i.e. no upscaling)
Skip sizes the original can't support
🗂 Naming / Folder structure:

For project ID abc123:

/images/abc123/original/filename.jpg
/images/abc123/small/filename.jpg
/images/abc123/thumb/filename.jpg
/images/abc123/full/filename.jpg
🧾 Metadata

Store references to all variants in DynamoDB
Include sort order, original size, and whether it's usable as a thumbnail
🔒 Security Considerations
Client-Side

Validate file type (JPG, PNG, HEIC only)
Validate file size (< 20MB)
Sanitize filenames before upload
Upload Process

Use pre-signed S3 URLs for secure, direct upload
S3 bucket policy:
Write-only for client uploads
Only backend can read/process objects
Lambda Processing

Validate image headers and dimensions (block malicious formats)
Strip EXIF data (optional but recommended)
Store processed images with server-side encryption (SSE-S3)
✅ Summary of Image Upload Step (Now Includes):
Feature	Included
Multi-image upload	✅
Client-side validation	✅
Drag to reorder	✅
Delete uploaded images	✅
S3 + Lambda resizing	✅
Prevent image upscaling	✅
Secure file upload process	✅
