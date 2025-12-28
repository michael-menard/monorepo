# Story wish-2006: Gallery Item Animations

## Status

Draft

## Story

**As a** user interacting with my wishlist gallery,
**I want** smooth animations when items are added or removed,
**so that** the interface feels polished and I understand what changed.

## PRD Reference

See [Epic 6: Wishlist PRD](/docs/prd/epic-6-wishlist.md):
- User Interface > Visual feedback

## Dependencies

- **wish-2001**: Wishlist Gallery MVP
- **wish-2004**: Modals & Transitions

## Acceptance Criteria

1. Item fades out when deleted from gallery
2. Item fades out when marked as purchased (Got It)
3. New items fade in when added to gallery
4. Animations are smooth (300ms duration)
5. Animations respect user's reduced motion preference
6. No layout shift during animations
7. Animations work in both grid and list views

## Tasks / Subtasks

### Task 1: Add Framer Motion to Gallery

- [ ] Add AnimatePresence wrapper to gallery list
- [ ] Configure exit animations for WishlistCard

### Task 2: Exit Animations

- [ ] Fade out + scale down on delete
- [ ] Fade out + slide right on "Got It" (implies moving to Sets)
- [ ] 300ms duration with ease-out

### Task 3: Entry Animations

- [ ] Fade in + scale up for new items
- [ ] Stagger animation for initial load (optional)

### Task 4: Accessibility

- [ ] Respect `prefers-reduced-motion` media query
- [ ] Disable animations when reduced motion preferred

### Task 5: Storybook Stories

- [ ] Create animation demo stories
- [ ] Show entry/exit in isolation

## Dev Notes

Use Framer Motion's AnimatePresence:
```tsx
import { AnimatePresence, motion } from 'framer-motion'

<AnimatePresence>
  {items.map(item => (
    <motion.div
      key={item.id}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.3 }}
    >
      <WishlistCard item={item} />
    </motion.div>
  ))}
</AnimatePresence>
```

## Testing

- [ ] Delete triggers fade out animation
- [ ] Got It triggers slide-out animation
- [ ] Add triggers fade in animation
- [ ] Reduced motion disables animations
- [ ] No layout shift during transitions

## Definition of Done

- [ ] Exit animations work for delete and Got It
- [ ] Entry animations work for new items
- [ ] Reduced motion respected
- [ ] Storybook stories created
- [ ] All tests pass
- [ ] Code reviewed

## Change Log

| Date       | Version | Description                        | Author |
| ---------- | ------- | ---------------------------------- | ------ |
| 2025-12-28 | 0.1     | Created from wish-2004 QA findings | Quinn  |
