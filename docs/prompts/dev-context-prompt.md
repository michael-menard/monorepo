# Development Context Prompt

Use this prompt when starting a new story to load essential project context.

---

## Prompt

```
Please review the following project documentation before we begin development work:

### Coding Standards & Style
- `/Users/michaelmenard/Development/Monorepo/.bmad-coding-style.md` - Core coding rules, Prettier/ESLint config, import patterns

### Architecture Documentation
- `/Users/michaelmenard/Development/Monorepo/docs/architecture/` - Tech stack, coding standards, source tree structure
- `/Users/michaelmenard/Development/Monorepo/docs/_archive/completed-prd/completed/sst-migration-architecture/project-structure.md` - API project structure (NO BARREL FILES rule)

### Front-End Specifications
- `/Users/michaelmenard/Development/Monorepo/docs/front-end-spec/index.md` - Front-end spec index
- `/Users/michaelmenard/Development/Monorepo/docs/front-end-spec/component-library-design-system.md` - Component library & design system
- `/Users/michaelmenard/Development/Monorepo/docs/front-end-spec/branding-style-guide.md` - Branding & style guide
- `/Users/michaelmenard/Development/Monorepo/docs/front-end-spec/accessibility-requirements.md` - Accessibility requirements
- `/Users/michaelmenard/Development/Monorepo/docs/front-end-spec/responsiveness-strategy.md` - Responsive design strategy
- `/Users/michaelmenard/Development/Monorepo/docs/front-end-spec/user-flows.md` - User flows
- `/Users/michaelmenard/Development/Monorepo/docs/front-end-spec/animation-micro-interactions.md` - Animations

### UX Design
- `/Users/michaelmenard/Development/Monorepo/docs/ux-design/ux-implementation-guidelines.md` - UX implementation guidelines
- `/Users/michaelmenard/Development/Monorepo/docs/ux-design/ux-page-designs.md` - Page designs
- `/Users/michaelmenard/Development/Monorepo/docs/ux-design/ux-migration-design-system.md` - Migration design system
- `/Users/michaelmenard/Development/Monorepo/docs/ux-design/mobile-error-states.md` - Mobile error states

### Key Rules to Follow
1. **NO BARREL FILES** - Always import directly from source files
2. **Use @repo/logger** - Never use console.log
3. **Zod schemas** - Prefer over TypeScript interfaces for validation
4. **No semicolons** - Prettier enforces this
5. **Single quotes** - Use 'string' not "string"
6. **Functional components** - Always use function declarations

Now I'm ready to work on the following story:
[PASTE STORY HERE]
```

---

## Quick Reference Commands

```bash
# Read all context docs at once
cat .bmad-coding-style.md
cat docs/architecture/coding-standards.md
cat docs/architecture/source-tree.md
cat docs/front-end-spec/index.md
cat docs/ux-design/ux-implementation-guidelines.md
```

---

## Story Template

When providing a story, include:

- Story file path (e.g., `/docs/stories/1.2.story-name.md`)
- Any specific focus areas or constraints
- Whether to commit changes when complete
