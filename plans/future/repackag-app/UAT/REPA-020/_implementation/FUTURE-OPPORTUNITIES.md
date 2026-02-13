# Future Opportunities - REPA-020

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Factory memoization not documented | Low - Performance optimization for large galleries | Low | Add useMemo example in factory JSDoc showing how callers can optimize re-renders |
| 2 | No validation helper for factory outputs | Low - Developers rely on TypeScript types | Low | Provide `validateCardProps(props)` helper that runs GalleryCardPropsSchema.parse() for debugging |
| 3 | Price formatting utility not shared | Medium - Duplication across WishlistCard and factory | Low | Extract price formatting to @repo/app-component-library or shared utility |
| 4 | Badge variant mapping not standardized | Low - Inconsistent badge colors across domains | Medium | Create BadgeVariantMap type and standard mappings for common badge types (status, priority, theme) |
| 5 | Image fallback logic duplicated | Medium - Thumbnail fallback pattern repeated in every factory | Low | Extract `getCardImage(item: { thumbnailUrl?, imageUrl? })` utility function |
| 6 | No factory composition pattern | Low - Factories are independent | Medium | Consider higher-order factory `createCardFactory<T>()` that accepts shared config |
| 7 | Missing dark mode variants for metadata | Low - Badges use default variants | Low | Add dark mode color mappings for domain-specific badges |
| 8 | No skeleton factory | Low - Skeleton loading is manual | Low | Add `createCardSkeleton(aspectRatio)` factory for consistent loading states |
| 9 | Storybook accessibility tests not mentioned | Medium - A11y verification manual | Medium | Add @storybook/addon-a11y to run axe-core checks on factory stories |
| 10 | No migration guide for adopting factories in existing cards | Low - Developers must figure out adoption path | Medium | Add MIGRATION.md showing before/after for InstructionCard using factory |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | Factory extensibility for custom domains | High - Enables third-party domain cards | Medium | Add generic `createCustomCardFactory<TDomain>(config)` that accepts custom field mappings |
| 2 | Automatic metadata generation from schema | Medium - Reduce boilerplate | High | Inspect domain schema fields and auto-generate badge slots (e.g., pieceCount always becomes "{count} pieces" badge) |
| 3 | Factory testing utilities | Medium - Simplifies factory tests | Low | Provide `testFactory(factory, mockData, expectedProps)` helper for standardized factory testing |
| 4 | Icon mapping configuration | Low - Icon choices are hardcoded | Low | Allow factories to accept `iconMap?: { favorite: LucideIcon, edit: LucideIcon }` for customization |
| 5 | Action button ordering configuration | Low - Button order is fixed | Low | Add `actionOrder?: ('favorite' | 'edit' | 'delete')[]` option to control button sequence |
| 6 | Responsive metadata slots | Medium - Metadata may overflow on mobile | Medium | Add `responsiveMetadata` option that conditionally renders badges based on viewport |
| 7 | Analytics event injection | Medium - Track card interactions | Low | Add `onTrackEvent?: (event: string, data: any) => void` callback for instrumentation |
| 8 | Factory chaining/composition | Low - Combine multiple factories | High | Allow `createCompositeCard([setFactory, instructionFactory])` for hybrid cards |
| 9 | Live preview in Storybook controls | High - Interactive factory playground | Medium | Add Storybook controls that let users modify domain data and see factory output update live |
| 10 | Factory code generation tool | Low - Speed up new domain adoption | High | CLI tool: `pnpm gen:card-factory MyDomain` scaffolds factory with TODO comments |

## Categories

### Edge Cases
- Factory behavior with null/undefined optional fields (partially covered in AC-7, AC-8)
- Very long titles/subtitles (mentioned in Test 10, GalleryCard handles truncation)
- Zero piece count display (covered in Test 9)
- Missing images (covered in AC-8 with fallback logic)

### UX Polish
- Badge color consistency across domains (Gap #4)
- Dark mode variant support (Gap #7)
- Responsive metadata for mobile (Enhancement #6)
- Tooltip on action buttons (mentioned in story future enhancements)
- Animation on hover (mentioned in story future enhancements)

### Performance
- Memoization guidance (Gap #1)
- Factory execution cost measurement (not mentioned)
- Lazy loading for factory-generated content (not applicable - factories are synchronous)

### Observability
- Analytics event injection (Enhancement #7)
- Factory usage telemetry (not mentioned)
- Error boundary integration for factory failures (not mentioned)

### Integrations
- Third-party domain card support (Enhancement #1)
- Factory plugin system for custom badges/actions (not mentioned)
- Integration with drag-and-drop (mentioned: will be extended after REPA-009)

### Developer Experience
- Migration guide (Gap #10)
- Live Storybook preview (Enhancement #9)
- Code generation tool (Enhancement #10)
- TypeScript autocomplete for factory options (already provided via Zod schemas)
- VSCode snippets for factory usage (not mentioned)

---

## Post-MVP Stories (Potential)

### REPA-020.1: Factory Adoption in Existing Cards
- Refactor InstructionCard, SetCard, WishlistCard to use factories internally
- Maintain backward compatibility with existing component APIs
- Reduce card component LOC by ~50%
- Estimate: 3 SP

### REPA-020.2: Advanced Factory Features
- Factory composition and chaining
- Generic createCustomCardFactory for third-party domains
- Automatic metadata generation from schemas
- Estimate: 5 SP

### REPA-020.3: Factory Developer Tools
- Storybook controls for interactive factory testing
- CLI code generation tool
- Migration guide and examples
- Estimate: 2 SP

---

## Notes

- Many enhancements blocked until existing cards migrate from `actions` to `hoverOverlay` (prerequisite: fix Issue #1 from ANALYSIS.md)
- Factory pattern is well-suited to incremental enhancement - can add features without breaking existing usages
- High adoption potential if migration guide and examples are clear
- Consider adding factory usage metrics to track adoption across apps
