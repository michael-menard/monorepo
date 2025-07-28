# 🎨 UI Rules

- All UI components use React + Tailwind + ShadCN
- Use TanStack Start for React apps
- Use Prettier (AirBnB style) for formatting
- Write atomic components, colocate logic and tests
- tests should be in a __tests__ directory as close 
- to the component it is testing as possible
- tests should be writen in vitest using msw, testing library, and mock all external dependencies like database calls, api calls
- all api calls should be made with RTK Query, or Apollo Client if calling a GraphQL endpoint, and not use axios or fetch. 
- use atomic design principals
- All public UI atom components live in `packages/ui`
- UI components larger than atoms live in the packages root
- prefer framer motion over css animations
