React Gallery Package (gallery-ui)

1. Overview

Create a reusable React package within a monorepo (gallery-ui) that displays an image gallery with search, filters, sorting, pagination/infinite scroll, and dual view modes: Table and Organic Gallery Wall.

The component is fully self-contained — it manages its own state, handles both static and dynamic data loading, and supports UI interactions like hover drawers and editing.

2. Goals

Build a standalone, self-managed image gallery component.
Provide a slick, responsive UI with rich interactions.
Support both static data and internal data fetching via a fetchImages prop.
Offer flexible usage across apps in a monorepo.
3. Features

🔀 View Toggle
Two modes:
Gallery Wall View (organic masonry)
Table View (ShadCN Table)
Toggle switch in the UI
🌇 Gallery Wall View
Organic layout using react-masonry-css or CSS grid
Infinite scroll using IntersectionObserver
Each image:
Rounded corners
Hover: Framer Motion animation slides up a drawer
Displays image title, tags, etc.
Icons: 👍 (like), 👎 (dislike), ⭐ (favorite)
✏️ Pencil icon in top-right for edit
Clicking pencil navigates to /instructions/:id/edit
📊 Table View
Built using ShadCN Table (imported from packages/ui)
Paginated
Columns: image, title, rating, tags, actions
Sortable and filterable headers
🔍 Common UI
Search bar (by title/tag)
Filter panel (tags, ratings)
Sort dropdown (e.g. date, rating)
Unified state management (internal to component)
4. Data Handling

✅ Supports Two Modes
1. Static Mode

Pass images array via props. Ideal for apps with already-fetched or small datasets.

<Gallery images={myImages} />
2. Dynamic Mode

Pass a fetchImages() function that supports pagination, filtering, sorting, and searching.

<Gallery
  fetchImages={async ({ page, filters, search, sort }) => {
    return await fetch(`/api/images?page=${page}&q=${search}`)
      .then((res) => res.json());
  }}
/>
Component handles:

Pagination (infinite scroll or next/prev)
Internal query state
📦 Props API
type ImageData = {
  id: string;
  url: string;
  title?: string;
  tags?: string[];
  rating?: number;
  [key: string]: any;
};

type FetchArgs = {
  page: number;
  filters: Record<string, string[]>;
  search: string;
  sort: string;
};

type GalleryProps = {
  images?: ImageData[];
  fetchImages?: (args: FetchArgs) => Promise<{
    data: ImageData[];
    hasMore: boolean;
  }>;

  view?: 'wall' | 'table';
  enableSearch?: boolean;
};
5. Tech Stack

React (TypeScript)
TailwindCSS (global in monorepo)
ShadCN UI (installed in packages/ui)
Framer Motion (for animation)
React Masonry CSS or custom CSS grid
IntersectionObserver or react-infinite-scroll-component
6. Deliverables

gallery-ui React package
Tree-shakable and typed
Internal state management
Optional external fetch support
Storybook or example app
JSDoc + README documentation
Demo for both view modes
7. Route Behavior

Clicking the ✏️ Pencil icon opens:
navigate('/instructions/:id/edit')
8. Internal Icons & Actions

👍 Thumbs up
👎 Thumbs down
⭐ Favorite
✏️ Edit
All actions handled internally (state, animation, etc.)
9. Tasks (Rough Breakdown)

Package Setup
 Create packages/gallery-ui
 Setup Tailwind + ShadCN from packages/ui
 Add Framer Motion and layout libs
Component Core
 Gallery component with view toggle + props logic
 Internal state for search, sort, filters, view mode
Table View
 Render table using ShadCN
 Paginate, sort, filter
Gallery Wall View
 Masonry layout + responsive behavior
 Infinite scroll
 Hover drawer with Framer Motion
 Icons + interactions
Data Integration
 Support images vs fetchImages
 Add fallback loader and error handling
Misc
 Route integration for edit
 Add type declarations + docs
