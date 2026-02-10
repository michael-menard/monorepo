# Project Brief: User Profile Page

## Executive Summary

This project delivers a personal profile page where users can view their avatar, high-level collection statistics, and an activity feed of their recent actions across the platform. The profile provides a centralized view of the user's LEGO MOC journey including collection breakdowns by theme, activity history, and achievement milestones. Built as a standalone micro-frontend (`app-profile`) with React 19, Tailwind CSS, and shadcn components, the profile integrates with existing dashboard endpoints and the upcoming socket.io service for real-time activity updates.

## Dependencies

| Dependency | Status | Required Before | Notes |
|------------|--------|-----------------|-------|
| Dashboard endpoints | In Progress | Activity feed | Reuse stats/collection data |
| Socket.io service | Planned | Real-time feed | Activity feed blocked by this epic |
| Image upload package | Available | Avatar upload | Existing infrastructure |

## Problem Statement

**Current State and Pain Points:**

Users currently lack a centralized view of their platform activity and collection status. Information is scattered across multiple gallery apps (instructions, sets, wishlist, inspiration) with no unified summary or activity history.

- **No Personal Hub:** Users cannot see an overview of their collection, activity, or progress in one place
- **No Activity History:** Users have no visibility into their recent actions across the platform
- **No Visual Identity:** Users cannot personalize their experience with an avatar or profile information
- **Fragmented Stats:** Collection statistics exist in the dashboard but aren't tied to a personal profile context

**Impact of the Problem:**

- **Reduced Engagement:** Users don't have a "home base" that reflects their journey
- **Lost Context:** Users forget what they were working on or recently added
- **No Sense of Progress:** Without milestones and achievements, users miss the satisfaction of building their collection

## Proposed Solution

**Core Concept and Approach:**

Build a standalone profile application (`app-profile`) that aggregates user data from existing services into a personal dashboard experience. The solution consists of:

1. **Profile Sidebar (Left Column):** Avatar, bio, stats, theme breakdown chart, and data visualizations
2. **Activity Feed (Right Column):** Chronological feed of user actions with time-based groupings
3. **Achievement System:** Milestone badges and celebrations for collection progress
4. **Mobile-Responsive Design:** Collapsible profile on mobile with feed taking primary focus

**Key Architectural Decisions:**

1. **Standalone micro-frontend** — Separate `app-profile` app following existing gallery app patterns
2. **Reuse dashboard endpoints** — Stats and collection data already available
3. **Socket.io integration** — Real-time feed updates when service is available
4. **Inline editing** — Edit profile fields in place without separate edit page
5. **Private by default** — Architected for future public profiles via user settings toggle

## Target Users

### Primary User Segment: Platform Members

**Profile:**
- Registered users who own instructions, track sets, and maintain wishlists
- Range from casual collectors to serious builders
- Use the platform regularly to manage their LEGO collection

**Goals:**
- See an overview of their collection at a glance
- Track recent activity and changes across galleries
- Personalize their experience with avatar and bio
- Feel a sense of progress and accomplishment

## Goals & Success Metrics

### Business Objectives

- **Increase Engagement:** Provide a personal hub that encourages return visits
- **Surface Activity:** Help users stay connected to their recent actions
- **Enable Personalization:** Let users express their builder identity
- **Celebrate Progress:** Reward users for collection milestones

### Key Performance Indicators (KPIs)

- **Profile Visits:** % of active users visiting their profile weekly
- **Avatar Upload Rate:** % of users with custom avatars
- **Feed Engagement:** Average scroll depth on activity feed
- **Time on Profile:** Average session duration on profile page

## MVP Scope

### Core Features (Must Have)

**Profile Sidebar:**

- **Avatar Display:** Show user avatar with fallback chain (uploaded > Gravatar > generated initials)
  - _Rationale:_ Visual identity is core to a profile experience

- **Avatar Upload:** Use existing image upload package for custom avatar
  - _Rationale:_ Personalization drives engagement

- **Basic Info:** Display name, bio/tagline, location (inline editable)
  - _Rationale:_ Standard profile elements users expect

- **Social Links:** Links to BrickLink, Rebrickable, Instagram, etc. (inline editable)
  - _Rationale:_ Builders want to connect their external presence

- **Builder Preferences:** Favorite themes, skill level, building style (inline editable)
  - _Rationale:_ Helps users express their builder identity

- **Collection Stats:** Counts for instructions owned, sets, wishlist items (reuse dashboard endpoints)
  - _Rationale:_ High-level numbers give sense of collection scope

- **Theme Donut Chart:** Percentage breakdown of sets by theme
  - _Rationale:_ Visual representation of collection composition

- **Collection by Theme:** Breakdown showing theme distribution
  - _Rationale:_ Users want to see their theme focus areas

**Activity Feed:**

- **Chronological Feed:** Most recent activities first
  - _Rationale:_ Standard feed pattern users understand

- **Time-Based Dividers:** Today, This Week, Last Week, Older
  - _Rationale:_ Helps users orient in time without strict date grouping

- **Activity Types:**
  - New MOC instructions created
  - Wishlist additions
  - New sets added
  - Wishlist to sets transitions (purchases)
  - Inspiration gallery changes
  - _Rationale:_ Covers the key actions users take across galleries

**Layout & Responsiveness:**

- **Two-Column Layout:** Profile sidebar left, activity feed right
  - _Rationale:_ Standard profile pattern; profile context always visible

- **Mobile Collapsible:** Profile collapses to minimal header on mobile, feed takes over
  - _Rationale:_ Feed is primary content; profile is secondary context on small screens

**Visibility:**

- **Private Only:** Profile visible only to logged-in user
  - _Rationale:_ MVP simplicity; public profiles are future scope

- **Architected for Public:** Data model supports future public toggle
  - _Rationale:_ Avoid rework when adding public profiles later

### Phase 2 Features (Post-MVP)

**Data Visualizations:**

- **Activity Heatmap:** GitHub-style grid showing activity over time
  - _Rationale:_ Gamification element showing consistency

- **Collection Growth Chart:** Line chart of sets/MOCs acquired over time
  - _Rationale:_ Shows progress and collection trajectory

**Achievements & Celebrations:**

- **Milestone Badges:** Badges for MOC completion counts (5, 10, 25, 50, etc.)
  - _Rationale:_ Gamification without per-MOC spam

- **Parts Complete Celebration:** Confetti animation + badge glow when all parts acquired for a MOC
  - _Rationale:_ Moment of delight for meaningful milestone

### Out of Scope

- Public profile visibility (Phase 2 - needs privacy controls)
- Price drop alerts in feed (separate epic - price tracking feature)
- Budget tracking (dashboard feature)
- Social features (follows, likes, comments)
- Profile theme/color customization (keep uniform for now)
- Spending trends visualization (dashboard feature)

### MVP Success Criteria

The MVP is successful when:

1. Users can view their profile with avatar, stats, and activity feed
2. Users can upload a custom avatar or fall back to Gravatar/initials
3. Users can edit their bio, social links, and preferences inline
4. Activity feed displays all tracked activity types with time dividers
5. Profile works on desktop (two-column) and mobile (collapsible)
6. Theme donut chart accurately reflects collection breakdown

## Technical Architecture

### Frontend

- **Location:** `apps/web/app-profile/`
- **Framework:** React 19 with TypeScript
- **Styling:** Tailwind CSS + shadcn/ui components
- **State Management:** React Query for server state
- **Routing:** TanStack Router (consistent with other gallery apps)
- **Charts:** Recharts or similar for donut chart and visualizations

### Backend

- **Stats Endpoints:** Reuse existing dashboard endpoints
- **Activity Endpoint:** New endpoint or socket.io subscription
- **Profile Data:** New profile table or extend user data

### API Endpoints

```
GET    /profile                    - Get current user's profile
PATCH  /profile                    - Update profile fields (bio, links, preferences)
POST   /profile/avatar             - Upload avatar image
DELETE /profile/avatar             - Remove avatar (revert to fallback)
GET    /profile/stats              - Get collection stats (may reuse dashboard)
GET    /profile/activity           - Get activity feed (paginated)
GET    /profile/themes             - Get theme breakdown for chart
```

### Database Schema Changes

**New table: `user_profiles`**

```sql
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL UNIQUE,           -- Cognito sub
  display_name TEXT,
  bio TEXT,
  location TEXT,
  avatar_url TEXT,                         -- S3 URL for uploaded avatar
  social_links JSONB DEFAULT '{}',         -- { bricklink, rebrickable, instagram, etc. }
  builder_preferences JSONB DEFAULT '{}',  -- { favorite_themes, skill_level, building_style }
  is_public BOOLEAN DEFAULT FALSE,         -- For future public profiles
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);
```

**New table: `user_activity`** (if not using socket.io event store)

```sql
CREATE TABLE user_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  activity_type TEXT NOT NULL,             -- 'moc_created', 'wishlist_add', 'set_add', 'wishlist_to_set', 'inspiration_change'
  entity_type TEXT NOT NULL,               -- 'moc', 'set', 'wishlist_item', 'inspiration'
  entity_id TEXT NOT NULL,
  entity_name TEXT,                        -- Denormalized for feed display
  entity_thumbnail TEXT,                   -- Denormalized thumbnail URL
  metadata JSONB DEFAULT '{}',             -- Activity-specific data
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_activity_user_id ON user_activity(user_id);
CREATE INDEX idx_user_activity_created ON user_activity(created_at DESC);
CREATE INDEX idx_user_activity_type ON user_activity(activity_type);
```

### Key Technical Components

**1. Avatar Fallback Chain**

```typescript
function getAvatarUrl(profile: UserProfile, email: string): string {
  // 1. Custom uploaded avatar
  if (profile.avatarUrl) {
    return profile.avatarUrl
  }

  // 2. Gravatar
  const gravatarUrl = getGravatarUrl(email)
  // Check if Gravatar exists (async check on load)

  // 3. Generated initials
  return generateInitialsAvatar(profile.displayName || email)
}
```

**2. Activity Feed with Time Dividers**

```typescript
function groupActivityByTime(activities: Activity[]): GroupedActivity[] {
  const now = new Date()
  const today = startOfDay(now)
  const thisWeek = startOfWeek(now)
  const lastWeek = subWeeks(thisWeek, 1)

  return [
    { label: 'Today', items: activities.filter(a => a.createdAt >= today) },
    { label: 'This Week', items: activities.filter(a => a.createdAt >= thisWeek && a.createdAt < today) },
    { label: 'Last Week', items: activities.filter(a => a.createdAt >= lastWeek && a.createdAt < thisWeek) },
    { label: 'Older', items: activities.filter(a => a.createdAt < lastWeek) },
  ].filter(group => group.items.length > 0)
}
```

**3. Theme Donut Chart Data**

```typescript
// Aggregate from existing collection data
async function getThemeBreakdown(userId: string): Promise<ThemeBreakdown[]> {
  const sets = await getUserSets(userId)

  const themeCounts = sets.reduce((acc, set) => {
    acc[set.theme] = (acc[set.theme] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const total = sets.length

  return Object.entries(themeCounts)
    .map(([theme, count]) => ({
      theme,
      count,
      percentage: (count / total) * 100,
    }))
    .sort((a, b) => b.count - a.count)
}
```

**4. Inline Editing**

```typescript
function InlineEditableField({
  value,
  onSave,
  placeholder,
}: InlineEditableFieldProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState(value)

  if (isEditing) {
    return (
      <input
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={() => {
          onSave(draft)
          setIsEditing(false)
        }}
        onKeyDown={e => {
          if (e.key === 'Enter') {
            onSave(draft)
            setIsEditing(false)
          }
          if (e.key === 'Escape') {
            setDraft(value)
            setIsEditing(false)
          }
        }}
        autoFocus
      />
    )
  }

  return (
    <span onClick={() => setIsEditing(true)} className="cursor-pointer hover:bg-muted">
      {value || placeholder}
    </span>
  )
}
```

## Constraints & Assumptions

### Constraints

- **Activity Feed Blocked:** Real-time feed depends on socket.io service epic
- **Stats Available:** Dashboard endpoints exist and can be reused
- **Image Upload Available:** Existing package for avatar uploads
- **Timeline:** Depends on socket.io service for full functionality

### Assumptions

- Users have existing data in galleries (sets, wishlist, instructions)
- Dashboard endpoints provide aggregated stats
- Socket.io service will emit events for activity tracking
- Mobile-first responsive design is sufficient (no native app)

## Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Socket.io delays | Activity feed unavailable | Build static feed from DB; add real-time later |
| Dashboard endpoint changes | Stats display breaks | Coordinate with dashboard epic; use stable contracts |
| Avatar upload failures | Poor user experience | Robust fallback chain (Gravatar > initials) |
| Large activity feeds | Performance issues | Pagination, virtual scrolling for long feeds |

## Related Epics & Future Features

### Separate Epic: Price Tracking & Alerts

- Track prices for MOCs user wants to build
- Alert when total MOC cost drops to new low
- Alert on best deals for tracked items
- **Not in scope for profile** - feeds into activity feed once built

### Separate Epic: Budget Tracking

- Monthly budget setting
- Spending tracking over time
- **Dashboard feature** - not profile

### Phase 2: Achievements System

- Milestone badges for MOC completion counts
- Confetti + badge glow celebrations
- Activity heatmap
- Collection growth chart

### Phase 3: Public Profiles

- Toggle in user settings
- Privacy controls per section
- Public profile URL

## Open Questions

1. **Activity Persistence:** Should activity be stored in dedicated table or derived from socket.io events?
2. **Stats Caching:** How fresh do stats need to be? Real-time or periodic refresh?
3. **Avatar Size Limits:** What dimensions and file size for uploaded avatars?
4. **Feed Pagination:** Infinite scroll or explicit "Load More"?

## Next Steps

### Pre-Development

1. Confirm socket.io service timeline
2. Review dashboard endpoints for reusable stats
3. Design profile UI mockups
4. Define activity event schema

### Development

**Phase 1: Core Profile (Can Start Now)**
- [ ] Create `app-profile` app scaffolding
- [ ] Implement profile sidebar with avatar, bio, links
- [ ] Implement inline editing
- [ ] Integrate with existing image upload for avatar
- [ ] Add Gravatar and initials fallbacks
- [ ] Create theme donut chart
- [ ] Implement stats display (reuse dashboard)

**Phase 2: Activity Feed (Blocked by Socket.io)**
- [ ] Create activity table/schema
- [ ] Implement activity feed endpoint
- [ ] Build feed UI with time dividers
- [ ] Integrate with socket.io for real-time updates

**Phase 3: Visualizations & Achievements**
- [ ] Add activity heatmap
- [ ] Add collection growth chart
- [ ] Implement milestone badges
- [ ] Add celebration animations

---

## Changelog

**2026-02-08 - Initial Draft**
- Created comprehensive plan from product owner interview
- Defined two-column layout with collapsible mobile design
- Specified activity feed with time-based dividers
- Identified socket.io dependency for real-time feed
- Separated price tracking into future epic
- Added phase 2 visualizations (heatmap, growth chart)
- Added phase 2 achievements (badges, celebrations)

---

**End of Plan**
