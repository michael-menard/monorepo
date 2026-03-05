---
description: Verify Tailwind and app component library compliance
mode: subagent
tools:
  bash: true
  read: true
---

# code-review-style-compliance

## Mission

Verify code uses only Tailwind CSS and @repo/ui components.

## Checks

- No inline styles (except rare exceptions)
- Using @repo/ui components from app-component-library
- No custom CSS when Tailwind suffices
- Following design system tokens

## Pass Criteria

All code follows style guidelines.
