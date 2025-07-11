# Cursor Rules & Configuration

This directory contains project-specific rules, settings, and context for using Cursor effectively in this monorepo.

## How to Use Rules Files

- **.cursor/rules**: The main rules file. Rules here are always applied by Cursor.
- **Additional rules files**: You can create as many rules files as you want for different domains or contexts, e.g.:
  - `.cursor/rules-ui.md` (UI-specific rules)
  - `.cursor/rules-api.md` (API/backend rules)
  - `.cursor/rules-deployment.md` (Deployment/infra rules)
  - `.cursor/rules-core.md` (Core/always-on rules)

## Marking Rules as Always-On
- Place any rules you want Cursor to always use in `.cursor/rules` (or `.cursor/rules-core.md` if you prefer, and symlink or copy to `.cursor/rules`).
- These rules will be applied to every Cursor session and suggestion.

## Referencing Rules in Prompts
- For context-specific rules, reference the relevant file(s) in your prompt, e.g.:
  - “Follow the rules in `.cursor/rules-ui.md` for this change.”
  - “Use both `.cursor/rules-core.md` and `.cursor/rules-api.md` for this refactor.”
- Cursor will use the referenced rules in addition to the always-on rules.

## Example Directory Structure
```
.cursor/
  rules                # Always-applied rules
  rules-ui.md          # UI-specific rules
  rules-api.md         # API/backend-specific rules
  rules-deployment.md  # Deployment/infra rules
  settings.json        # Cursor settings
  chat.md              # Project chat context
  README.md            # This file
```

## Best Practices
- Keep your always-on rules in `.cursor/rules`.
- Use additional rules files for context-specific or team-specific guidelines.
- Reference extra rules files in your prompts when needed for special cases.
- Update this README if you add new rules files or change your rules organization.

---

This setup helps keep your rules organized, maintainable, and easy to use with Cursor for any project or team member. 