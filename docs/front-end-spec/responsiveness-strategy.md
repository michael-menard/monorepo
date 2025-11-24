# Responsiveness Strategy

## Breakpoints

| Breakpoint | Min Width | Max Width | Target Devices                     |
| ---------- | --------- | --------- | ---------------------------------- |
| Mobile     | 320px     | 767px     | Smartphones, small tablets         |
| Tablet     | 768px     | 1023px    | Tablets, small laptops             |
| Desktop    | 1024px    | 1439px    | Laptops, desktop monitors          |
| Wide       | 1440px    | -         | Large monitors, ultrawide displays |

## Adaptation Patterns

**Layout Changes:** Single column on mobile, multi-column grid on tablet/desktop. Navigation collapses to hamburger menu on mobile. Sidebar filters become bottom sheet on mobile.

**Navigation Changes:** Top navigation becomes collapsible drawer on mobile. Tab navigation becomes horizontal scroll on mobile. Breadcrumbs hide on mobile except for deep navigation.

**Content Priority:** Hide secondary information on mobile, prioritize primary actions. Image carousels become swipeable on touch devices. Long lists implement virtual scrolling on mobile.

**Interaction Changes:** Hover states become touch states on mobile. Drag-and-drop becomes long-press and drag on touch devices. Context menus become action sheets on mobile.
