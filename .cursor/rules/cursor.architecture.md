# 🧱 Architecture Rules

- Use apps/ for deployed services
- Use packages/ for shared logic, UI, and types
- Never mix infra and logic in the same package
- All packages must declare `exports` and be tree-shakeable
- Use `pnpm-workspace.yaml` to declare structure
