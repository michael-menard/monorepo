# State Management Guide

## Global State
- Use Redux Toolkit and RTK Query for global state and data fetching
- Store auth, user, and app-wide state in Redux

## RTK Query
- Use `createApi` for API endpoints
- Auto-generate hooks for data fetching and mutation

## Adding New Slices/Endpoints
1. Create a new slice in `store/` for local state
2. Add new endpoints to `services/authApi.ts` or similar
3. Use generated hooks in components

## Example
```ts
// store/userSlice.ts
const userSlice = createSlice({ ... })

// services/authApi.ts
const authApi = createApi({ ... })
``` 