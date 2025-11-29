# Coding Standards

This document defines the coding standards and best practices for the LEGO MOC Instructions monorepo.

## Table of Contents

- [Language Standards](#language-standards)
- [File Naming](#file-naming)
- [Code Style](#code-style)
- [Modern ES7+ Syntax](#modern-es7-syntax)
- [Import Order](#import-order)
- [React Standards](#react-standards)
- [Type Safety](#type-safety)
- [Error Handling](#error-handling)
- [Logging](#logging)
- [Testing](#testing)
- [Security](#security)
- [Performance](#performance)
- [Documentation](#documentation)
- [Git Workflow](#git-workflow)
- [Design System](#design-system)
- [Common Pitfalls to Avoid](#common-pitfalls-to-avoid)
- [Key Dependencies](#key-dependencies)

## Language Standards

### TypeScript-Only Codebase

**CRITICAL: All new code must be TypeScript (.ts or .tsx files).**

- ❌ **Never** create new JavaScript (.js or .jsx) files
- ✅ All source files must use TypeScript
- ✅ Configuration files that require .js (e.g., some build configs) are the only exception
- ✅ Strict mode enabled across all packages

**Example:**

```typescript
// ✅ Good - TypeScript with explicit types
export function calculateTotal(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.price, 0)
}

// ❌ Bad - JavaScript file or implicit any types
export function calculateTotal(items) {
  return items.reduce((sum, item) => sum + item.price, 0)
}
```

### Zod Schemas + Inferred Types

**Prefer Zod schemas with type inference over manual type definitions.**

- ✅ Use Zod for all data validation at boundaries (API, forms, env vars)
- ✅ Infer TypeScript types from Zod schemas using `z.infer<typeof schema>`
- ✅ Single source of truth for shape and validation logic

**Example:**

```typescript
// ✅ Preferred - Single source of truth
import { z } from 'zod'

export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().min(1).max(100),
  role: z.enum(['admin', 'user', 'guest']),
})

export type User = z.infer<typeof UserSchema>

// Validation at boundary
const user = UserSchema.parse(apiResponse)

// ❌ Avoid - Duplicates shape definition
interface User {
  id: string
  email: string
  name: string
  role: 'admin' | 'user' | 'guest'
}

// Now you need separate validation logic
if (!isValidEmail(user.email)) {
  /* ... */
}
```

## File Naming

### General Rules

- **Files**: `kebab-case.ts` (e.g., `user-profile.tsx`, `api-client.ts`)
- **Components**: `PascalCase` in filename and export (e.g., `UserProfile.tsx`)
- **Functions/Variables**: `camelCase` (e.g., `getUserById`, `isAuthenticated`)
- **Constants**: `UPPER_SNAKE_CASE` for true constants (e.g., `MAX_RETRIES`, `API_BASE_URL`)
- **Types/Interfaces**: `PascalCase` (e.g., `UserProfile`, `ApiResponse`)

**Examples:**

```
✅ Good
src/
  components/
    UserProfile.tsx       # Component
    user-avatar.tsx       # Component
  utils/
    api-client.ts         # Utility
    date-formatter.ts     # Utility
  types/
    user.types.ts         # Type definitions

❌ Bad
src/
  components/
    userProfile.tsx       # Wrong case
    User_Avatar.tsx       # Wrong separator
  utils/
    apiClient.ts          # Should be kebab-case
    DateFormatter.ts      # Should be kebab-case
```

## Code Style

### ESLint & Prettier

- **ESLint 9** with Airbnb style guide (configured in monorepo root)
- **Prettier** for consistent formatting
- Run `pnpm lint:fix` before committing
- Pre-commit hooks enforce formatting

#### Prettier Configuration

```json
{
  "semi": false,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2,
  "arrowParens": "avoid",
  "endOfLine": "lf"
}
```

#### ESLint Key Rules

- `@typescript-eslint/no-explicit-any`: OFF (any is allowed but discouraged)
- `no-console`: WARN (use `@repo/logger` instead)
- `prefer-const`: ERROR
- Import order: builtin -> external -> internal -> parent -> sibling -> index
- React hooks rules disabled (ESLint 9 compatibility)

### TypeScript Strict Mode

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

- ⚠️ **Avoid `any` when possible** - Use `unknown` and narrow the type (ESLint allows `any` but it's discouraged)

### Modern ES7+ Syntax

**CRITICAL: Use modern JavaScript/TypeScript syntax. Arrow functions and ES7+ features are preferred.**

#### Arrow Functions

- ✅ **Prefer arrow functions** for all non-method functions
- ✅ Use implicit returns for simple expressions
- ✅ Use arrow functions for callbacks, event handlers, and utility functions

```typescript
// ✅ Preferred - Arrow functions
const calculateTotal = (items: CartItem[]): number =>
  items.reduce((sum, item) => sum + item.price, 0)

const handleClick = () => {
  dispatch(updateItem(itemId))
}

const users = data.filter(user => user.isActive).map(user => user.name)

// ❌ Avoid - Function declarations for utilities
function calculateTotal(items: CartItem[]): number {
  return items.reduce(function (sum, item) {
    return sum + item.price
  }, 0)
}
```

#### ES7+ Features to Use

```typescript
// ✅ Object spread
const updated = { ...original, name: 'New Name' }

// ✅ Array spread
const combined = [...array1, ...array2]

// ✅ Optional chaining
const name = user?.profile?.displayName

// ✅ Nullish coalescing
const value = input ?? defaultValue

// ✅ Logical assignment operators
options.timeout ??= 5000
user.count ||= 0

// ✅ Array methods (map, filter, reduce, find, some, every)
const activeUsers = users.filter(u => u.isActive)
const hasAdmin = users.some(u => u.role === 'admin')

// ✅ Object.entries, Object.fromEntries
const entries = Object.entries(config)
const mapped = Object.fromEntries(entries.map(([k, v]) => [k, v.toUpperCase()]))

// ✅ Async/await over .then() chains
const fetchUser = async (id: string): Promise<User> => {
  const response = await api.get(`/users/${id}`)
  return response.data
}

// ❌ Avoid - Promise .then() chains
function fetchUser(id) {
  return api.get(`/users/${id}`).then(response => {
    return response.data
  })
}

// ✅ Destructuring
const { name, email, role = 'user' } = user
const [first, second, ...rest] = items

// ✅ Template literals
const message = `Hello ${user.name}, you have ${count} notifications`

// ❌ Avoid - String concatenation
const message = 'Hello ' + user.name + ', you have ' + count + ' notifications'
```

#### Functional Programming Paradigm

**CRITICAL: This codebase uses functional programming. Classes are prohibited except where required by external libraries.**

- ❌ **NEVER** create classes for business logic, services, or utilities
- ❌ **NEVER** use class-based patterns (inheritance, abstract classes, class decorators)
- ✅ **ALWAYS** use pure functions, closures, and composition
- ✅ **ALWAYS** prefer immutable data patterns

```typescript
// ❌ PROHIBITED - Class-based service
class UserService {
  private cache: Map<string, User>

  constructor() {
    this.cache = new Map()
  }

  async getUser(id: string): Promise<User> {
    if (this.cache.has(id)) return this.cache.get(id)!
    const user = await fetchUser(id)
    this.cache.set(id, user)
    return user
  }
}

// ✅ REQUIRED - Functional approach with closures
const createUserService = () => {
  const cache = new Map<string, User>()

  return {
    getUser: async (id: string): Promise<User> => {
      if (cache.has(id)) return cache.get(id)!
      const user = await fetchUser(id)
      cache.set(id, user)
      return user
    },
  }
}

// ✅ PREFERRED - Pure functions with explicit dependencies
const getUser = async (
  id: string,
  cache: Map<string, User>,
  fetcher: (id: string) => Promise<User>,
): Promise<User> => {
  if (cache.has(id)) return cache.get(id)!
  const user = await fetcher(id)
  cache.set(id, user)
  return user
}
```

#### Functional Patterns to Use

```typescript
// ✅ Composition over inheritance
const withLogging =
  <T extends (...args: unknown[]) => unknown>(fn: T) =>
  (...args: Parameters<T>): ReturnType<T> => {
    logger.debug('Calling function', { args })
    return fn(...args) as ReturnType<T>
  }

// ✅ Factory functions instead of constructors
const createValidator = (schema: ZodSchema) => ({
  validate: (data: unknown) => schema.safeParse(data),
  validateOrThrow: (data: unknown) => schema.parse(data),
})

// ✅ Higher-order functions
const filterByStatus = (status: string) => (items: Item[]) =>
  items.filter(item => item.status === status)

const activeItems = filterByStatus('active')
const pendingItems = filterByStatus('pending')

// ✅ Immutable updates
const updateUser = (user: User, updates: Partial<User>): User => ({
  ...user,
  ...updates,
  updatedAt: new Date(),
})

// ❌ PROHIBITED - Mutating state
const updateUser = (user: User, updates: Partial<User>): User => {
  user.name = updates.name ?? user.name
  user.updatedAt = new Date()
  return user
}
```

#### When Classes Are Acceptable

Classes are ONLY acceptable when:

- Required by external libraries (e.g., custom Error classes)
- React class components for error boundaries (the only case React requires classes)

```typescript
// ✅ Acceptable - Custom error class (required pattern)
export class ValidationError extends Error {
  constructor(
    message: string,
    public field: string,
    public code: string,
  ) {
    super(message)
    this.name = 'ValidationError'
  }
}

// ✅ Acceptable - React Error Boundary (React requires class)
class ErrorBoundary extends React.Component<Props, State> {
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }
  // ...
}
```

#### Function Declarations vs Arrow Functions

Both are acceptable for React components:

```typescript
// ✅ Acceptable - Function declaration for components
export function UserProfile({ userId }: UserProfileProps) {
  return <div>...</div>
}

// ✅ Also acceptable - Arrow function for components
export const UserProfile = ({ userId }: UserProfileProps) => {
  return <div>...</div>
}
```

### Additional TypeScript Rules

- ❌ **Avoid `@ts-ignore`** - Use `@ts-expect-error` with justification comment
- ✅ Use type guards for narrowing
- ✅ Prefer `const` over `let`, never use `var`

**Example:**

```typescript
// ❌ Bad - Uses any
function processData(data: any) {
  return data.value
}

// ✅ Good - Uses unknown and type guard
function processData(data: unknown): string | null {
  if (isValidData(data)) {
    return data.value
  }
  return null
}

function isValidData(data: unknown): data is { value: string } {
  return typeof data === 'object' && data !== null && 'value' in data
}
```

## Import Order

Organize imports in three groups, separated by blank lines:

1. **External dependencies** (from node_modules)
2. **Internal packages** (`@repo/*`, `@monorepo/*`)
3. **Relative imports** (`./ or ../`)

**Example:**

```typescript
// ✅ Good - Properly ordered imports
import { useState, useEffect } from 'react'
import { z } from 'zod'

import { Button } from '@repo/ui'
import { uploadFile } from '@repo/upload'

import { formatDate } from './utils/date-formatter'
import { UserProfile } from './UserProfile'

// ❌ Bad - Mixed order
import { UserProfile } from './UserProfile'
import { useState } from 'react'
import { Button } from '@repo/ui'
import { formatDate } from './utils/date-formatter'
```

### Use Specific Imports

- ✅ Import specific exports: `import { Button } from '@repo/ui'`
- ✅ Use path aliases from tsconfig.json

### No Barrel Files

**CRITICAL: Barrel files (index.ts re-exports) are PROHIBITED in this codebase.**

#### Why Barrel Files Are Banned

1. **Bundle size**: Tree-shaking becomes ineffective; unused exports get bundled
2. **Build performance**: Turborepo/Vite must process entire dependency chains
3. **Circular dependencies**: Barrel files are the #1 cause of circular import issues
4. **IDE performance**: Slower autocomplete and go-to-definition
5. **Hot reload**: Changes trigger unnecessary module reloads

#### The Rule

- ❌ **NEVER** create `index.ts` files that re-export from other files
- ❌ **NEVER** import from a directory path (e.g., `from '@/components'`)
- ✅ **ALWAYS** import directly from the source file

```typescript
// ❌ PROHIBITED - Barrel file pattern
// components/index.ts
export { Button } from './Button'
export { Card } from './Card'
export { Dialog } from './Dialog'

// ❌ PROHIBITED - Importing from barrel/directory
import { Button, Card } from '@/components'
import { userSlice } from '@/store/slices'

// ✅ REQUIRED - Direct imports from source files
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { userSlice } from '@/store/slices/userSlice'
```

#### Exceptions

The ONLY acceptable barrel files are in shared packages where the package.json `exports` field explicitly defines the entry point:

- `@repo/ui` - The UI package barrel is acceptable (package boundary)
- `@repo/logger` - The logger package barrel is acceptable (package boundary)

These package-level barrels are managed carefully and represent published API surfaces.

### Package Import Patterns

#### shadcn/ui Components

**ALWAYS import shadcn/ui components from the @repo/ui package:**

```typescript
// ✅ Correct - Single import from package
import { Button, Card, Table, Dialog } from '@repo/ui'

// ❌ Wrong - Individual path imports
import { Button } from '@repo/ui/button'
import { Card } from '@repo/ui/card'
```

#### Logging

**ALWAYS use @repo/logger instead of console.log:**

```typescript
// ✅ Correct - Using logger package
import { logger } from '@repo/logger'

logger.info('User action completed')
logger.error('API call failed', { error, userId })
logger.warn('Rate limit approaching', { count })
logger.debug('Processing data', { payload })

// ❌ Wrong - Console logging
console.log('User action completed')
console.error('API call failed', error)
```

## React Standards

### Component Architecture

#### Functional Components Only

- ✅ Use functional components with hooks
- ❌ No class components
- ✅ TypeScript with explicit prop types

**Example:**

```typescript
// ✅ Good - Functional component with TypeScript
interface UserProfileProps {
  userId: string
  onUpdate?: (user: User) => void
}

export function UserProfile({ userId, onUpdate }: UserProfileProps) {
  const [user, setUser] = useState<User | null>(null)

  // Component logic...

  return <div>{/* JSX */}</div>
}

// ❌ Bad - Class component
class UserProfile extends React.Component<UserProfileProps> {
  render() {
    return <div>{/* JSX */}</div>
  }
}
```

#### Component File Structure

```typescript
// UserProfile.tsx

// 1. Imports (external, internal, relative)
import { useState, useEffect } from 'react'
import { z } from 'zod'

import { Button } from '@repo/ui'
import { useAppDispatch } from '@/store/hooks'

import { formatDate } from './utils'

// 2. Type definitions and schemas
const UserProfileSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
})

type UserProfile = z.infer<typeof UserProfileSchema>

interface UserProfileProps {
  userId: string
}

// 3. Component definition
export function UserProfile({ userId }: UserProfileProps) {
  // Hooks first
  const dispatch = useAppDispatch()
  const [user, setUser] = useState<UserProfile | null>(null)

  useEffect(() => {
    // Effect logic
  }, [userId])

  // Event handlers
  const handleUpdate = () => {
    // Handler logic
  }

  // Early returns for loading/error states
  if (!user) return <div>Loading...</div>

  // Main render
  return (
    <div>
      <h1>{user.name}</h1>
      <Button onClick={handleUpdate}>Update</Button>
    </div>
  )
}
```

### State Management with Redux Toolkit

**CRITICAL: Use Redux Toolkit (RTK) exclusively for global state management.**

#### Store Setup

```typescript
// store/store.ts
import { configureStore } from '@reduxjs/toolkit'
import { setupListeners } from '@reduxjs/toolkit/query'
import { authApi } from './authApi'
import authReducer from './slices/authSlice'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    // Add the RTK Query API reducer
    [authApi.reducerPath]: authApi.reducer,
  },
  // Add the RTK Query middleware
  middleware: getDefaultMiddleware => getDefaultMiddleware().concat(authApi.middleware),
})

// Enable refetchOnFocus/refetchOnReconnect behaviors
setupListeners(store.dispatch)

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
```

#### Typed Hooks

```typescript
// store/hooks.ts
import { useDispatch, useSelector } from 'react-redux'
import type { RootState, AppDispatch } from './store'

// ✅ Use these typed hooks throughout the app
export const useAppDispatch = useDispatch.withTypes<AppDispatch>()
export const useAppSelector = useSelector.withTypes<RootState>()
```

#### Redux Slices

```typescript
// store/slices/authSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit'

interface AuthState {
  user: User | null
  isAuthenticated: boolean
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload
      state.isAuthenticated = true
    },
    logout: state => {
      state.user = null
      state.isAuthenticated = false
    },
  },
})

export const { setUser, logout } = authSlice.actions
export default authSlice.reducer
```

#### Usage in Components

```typescript
// ✅ Good - Typed hooks
import { useAppSelector, useAppDispatch } from '@/store/hooks'
import { setUser, logout } from '@/store/slices/authSlice'

function Header() {
  const user = useAppSelector((state) => state.auth.user)
  const dispatch = useAppDispatch()

  const handleLogout = () => {
    dispatch(logout())
  }

  return <div>{user?.name}</div>
}

// ❌ Bad - Untyped hooks
import { useSelector, useDispatch } from 'react-redux'

function Header() {
  const user = useSelector((state: any) => state.auth.user) // Untyped!
  const dispatch = useDispatch()
  // ...
}
```

### Data Fetching with RTK Query

**CRITICAL: Use RTK Query exclusively for all data fetching. Do NOT use axios or fetch directly in feature code.**

#### API Slice Definition

```typescript
// store/api/userApi.ts
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

export const userApi = createApi({
  reducerPath: 'userApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api',
    prepareHeaders: (headers, { getState }) => {
      // Add auth token from state
      const token = (getState() as RootState).auth.token
      if (token) {
        headers.set('authorization', `Bearer ${token}`)
      }
      return headers
    },
  }),
  tagTypes: ['User', 'Profile'],
  endpoints: builder => ({
    // Query endpoints (GET)
    getUser: builder.query<User, string>({
      query: userId => `/users/${userId}`,
      providesTags: (result, error, userId) => [{ type: 'User', id: userId }],
    }),

    listUsers: builder.query<User[], void>({
      query: () => '/users',
      providesTags: result =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'User' as const, id })),
              { type: 'User', id: 'LIST' },
            ]
          : [{ type: 'User', id: 'LIST' }],
    }),

    // Mutation endpoints (POST, PUT, DELETE)
    createUser: builder.mutation<User, CreateUserRequest>({
      query: body => ({
        url: '/users',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'User', id: 'LIST' }],
    }),

    updateUser: builder.mutation<User, { id: string; data: UpdateUserRequest }>({
      query: ({ id, data }) => ({
        url: `/users/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'User', id }],
    }),

    deleteUser: builder.mutation<void, string>({
      query: userId => ({
        url: `/users/${userId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, userId) => [
        { type: 'User', id: userId },
        { type: 'User', id: 'LIST' },
      ],
    }),
  }),
})

export const {
  useGetUserQuery,
  useListUsersQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useDeleteUserMutation,
} = userApi
```

#### Usage in Components

```typescript
// ✅ Good - RTK Query hooks
import { useGetUserQuery, useUpdateUserMutation } from '@/store/api/userApi'

function UserProfile({ userId }: { userId: string }) {
  // Query hook
  const { data: user, isLoading, error } = useGetUserQuery(userId)

  // Mutation hook
  const [updateUser, { isLoading: isUpdating }] = useUpdateUserMutation()

  const handleUpdate = async () => {
    try {
      await updateUser({ id: userId, data: { name: 'New Name' } }).unwrap()
      toast.success('User updated!')
    } catch (error) {
      toast.error('Failed to update user')
    }
  }

  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Error loading user</div>
  if (!user) return null

  return (
    <div>
      <h1>{user.name}</h1>
      <Button onClick={handleUpdate} disabled={isUpdating}>
        Update
      </Button>
    </div>
  )
}

// ❌ Bad - Direct fetch/axios in component
import axios from 'axios'

function UserProfile({ userId }: { userId: string }) {
  const [user, setUser] = useState(null)

  useEffect(() => {
    axios.get(`/api/users/${userId}`).then((res) => setUser(res.data))
  }, [userId])

  // No automatic caching, refetching, or error handling
}
```

#### RTK Query Best Practices

1. **Tags for Cache Invalidation**: Always use `providesTags` and `invalidatesTags`
2. **Optimistic Updates**: Use `onQueryStarted` for immediate UI feedback
3. **Error Handling**: Handle errors in components with try-catch on mutations
4. **Polling**: Use `pollingInterval` for real-time data when needed
5. **Prefetching**: Use `usePrefetch` or manual `dispatch` for data preloading

**Optimistic Update Example:**

```typescript
updateUser: builder.mutation<User, { id: string; data: UpdateUserRequest }>({
  query: ({ id, data }) => ({
    url: `/users/${id}`,
    method: 'PATCH',
    body: data,
  }),
  async onQueryStarted({ id, data }, { dispatch, queryFulfilled }) {
    // Optimistically update the cache
    const patchResult = dispatch(
      userApi.util.updateQueryData('getUser', id, (draft) => {
        Object.assign(draft, data)
      })
    )
    try {
      await queryFulfilled
    } catch {
      // Rollback on error
      patchResult.undo()
    }
  },
}),
```

### Routing with TanStack Router

**CRITICAL: Use TanStack Router exclusively. Do NOT introduce React Router or alternatives.**

#### Route Definition

```typescript
// routes/user.$userId.tsx
import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

const userSearchSchema = z.object({
  tab: z.enum(['profile', 'settings', 'history']).optional().default('profile'),
})

export const Route = createFileRoute('/user/$userId')({
  // Validate path params
  parseParams: (params) => ({
    userId: z.string().uuid().parse(params.userId),
  }),
  // Validate search params
  validateSearch: userSearchSchema,
  // Loader for data fetching
  loader: async ({ params }) => {
    // Can dispatch RTK Query here if needed
    return { userId: params.userId }
  },
  component: UserPage,
})

function UserPage() {
  const { userId } = Route.useParams()
  const { tab } = Route.useSearch()

  return <div>User {userId} - Tab: {tab}</div>
}
```

#### Navigation

```typescript
// ✅ Good - TanStack Router navigation
import { Link, useNavigate } from '@tanstack/react-router'

function Navigation() {
  const navigate = useNavigate()

  return (
    <div>
      <Link to="/user/$userId" params={{ userId: '123' }}>
        View User
      </Link>

      <button onClick={() => navigate({ to: '/dashboard' })}>
        Go to Dashboard
      </button>
    </div>
  )
}

// ❌ Bad - React Router (do not use)
import { Link } from 'react-router-dom' // Wrong library!
```

### React Hooks Best Practices

#### Hook Rules

1. ✅ Call hooks at the top level (not in conditions/loops)
2. ✅ Call hooks from React functions only
3. ✅ Use descriptive custom hook names starting with `use`
4. ✅ Extract complex logic into custom hooks

#### Custom Hooks

```typescript
// hooks/useDebounce.ts
import { useState, useEffect } from 'react'

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => clearTimeout(handler)
  }, [value, delay])

  return debouncedValue
}

// Usage
function SearchInput() {
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 500)

  // Use debouncedSearch for API calls
}
```

#### useEffect Best Practices

```typescript
// ✅ Good - Explicit dependencies, cleanup function
useEffect(() => {
  const controller = new AbortController()

  fetchData(userId, controller.signal).then(setData).catch(handleError)

  return () => controller.abort() // Cleanup
}, [userId]) // Explicit dependency

// ❌ Bad - Missing dependencies, no cleanup
useEffect(() => {
  fetchData(userId).then(setData)
}, []) // Missing userId dependency!
```

#### useMemo and useCallback

**Only use when profiling shows performance benefit. Do not use by default.**

```typescript
// ✅ Good - Use for expensive calculations
const sortedItems = useMemo(() => {
  return items.sort((a, b) => expensiveComputation(a, b))
}, [items])

// ✅ Good - Stable callback reference for child components
const handleClick = useCallback(() => {
  dispatch(updateItem(itemId))
}, [dispatch, itemId])

// ❌ Bad - Unnecessary memoization
const fullName = useMemo(() => `${firstName} ${lastName}`, [firstName, lastName])
// Just use: const fullName = `${firstName} ${lastName}`
```

### Component Patterns

#### Compound Components

```typescript
// ✅ Good - Compound component pattern for complex UI
export function Tabs({ children }: { children: React.ReactNode }) {
  const [activeTab, setActiveTab] = useState(0)

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      {children}
    </TabsContext.Provider>
  )
}

Tabs.List = function TabsList({ children }: { children: React.ReactNode }) {
  return <div role="tablist">{children}</div>
}

Tabs.Tab = function Tab({ index, children }: { index: number; children: React.ReactNode }) {
  const { activeTab, setActiveTab } = useTabsContext()
  return (
    <button
      role="tab"
      aria-selected={activeTab === index}
      onClick={() => setActiveTab(index)}
    >
      {children}
    </button>
  )
}

// Usage
<Tabs>
  <Tabs.List>
    <Tabs.Tab index={0}>Profile</Tabs.Tab>
    <Tabs.Tab index={1}>Settings</Tabs.Tab>
  </Tabs.List>
  <Tabs.Panel index={0}>Profile content</Tabs.Panel>
  <Tabs.Panel index={1}>Settings content</Tabs.Panel>
</Tabs>
```

#### Render Props (Use Sparingly)

```typescript
// Use only when children need to access internal state
function DataProvider({ children }: { children: (data: Data) => React.ReactNode }) {
  const [data, setData] = useState<Data | null>(null)

  return <>{children(data)}</>
}

// Usage
<DataProvider>
  {(data) => data ? <DataDisplay data={data} /> : <Loading />}
</DataProvider>
```

### Accessibility (a11y)

- ✅ Use semantic HTML (`<button>`, `<nav>`, `<main>`, etc.)
- ✅ Add ARIA labels where needed
- ✅ Ensure keyboard navigation works
- ✅ Use Radix UI components (built-in accessibility)
- ✅ Test with screen readers

```typescript
// ✅ Good - Semantic HTML + ARIA
<button
  onClick={handleDelete}
  aria-label="Delete user profile"
  disabled={isDeleting}
>
  <TrashIcon />
</button>

// ❌ Bad - Non-semantic, inaccessible
<div onClick={handleDelete} style={{ cursor: 'pointer' }}>
  <TrashIcon />
</div>
```

### Forms with Zod Validation

```typescript
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

type LoginFormData = z.infer<typeof loginSchema>

function LoginForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginFormData) => {
    await loginUser(data)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('email')} />
      {errors.email && <span>{errors.email.message}</span>}

      <input type="password" {...register('password')} />
      {errors.password && <span>{errors.password.message}</span>}

      <button type="submit" disabled={isSubmitting}>
        Login
      </button>
    </form>
  )
}
```

## Type Safety

### Never Use Throw New Error

**CRITICAL: Never use `throw new Error()` - Always create custom error types.**

- ❌ `throw new Error('Something went wrong')`
- ✅ Create typed error classes in `packages/` directory
- ✅ Errors should be typed and provide context

**Example:**

```typescript
// ✅ Good - Custom error class
export class ValidationError extends Error {
  constructor(
    message: string,
    public field: string,
    public code: string,
  ) {
    super(message)
    this.name = 'ValidationError'
  }
}

// Usage
if (!isValidEmail(email)) {
  throw new ValidationError('Invalid email format', 'email', 'INVALID_EMAIL')
}

// ❌ Bad - Generic error
if (!isValidEmail(email)) {
  throw new Error('Invalid email')
}
```

### Avoid Non-Null Assertions

- ❌ Minimize use of `!` (non-null assertion operator)
- ✅ Validate inputs explicitly or use optional chaining
- ✅ When necessary, add comment explaining why it's safe

**Example:**

```typescript
// ❌ Bad - Non-null assertion without validation
const userId = pathParams.id!
const user = await getUser(userId)

// ✅ Good - Explicit validation
const userId = pathParams.id
if (!userId || !isValidUUID(userId)) {
  throw new ValidationError('Invalid user ID', 'id', 'INVALID_UUID')
}
const user = await getUser(userId)

// ✅ Acceptable - With justification
const userId = pathParams.id! // Safe: API Gateway guarantees id in path params for this route
```

## Error Handling

### Never Expose 500 Errors to Users

- ❌ Don't expose raw error messages to users
- ✅ Provide meaningful, user-friendly error messages
- ✅ Log detailed errors server-side only
- ✅ Use custom error types with error codes

**Example:**

```typescript
// ✅ Good - User-friendly error handling
try {
  await processPayment(order)
} catch (error) {
  logger.error('Payment processing failed', { error, orderId: order.id })

  if (error instanceof PaymentError) {
    throw new ApiError(
      400,
      'PAYMENT_FAILED',
      'Unable to process payment. Please check your card details.',
    )
  }

  throw new ApiError(500, 'INTERNAL_ERROR', 'An unexpected error occurred. Please try again later.')
}

// ❌ Bad - Exposes internal details
try {
  await processPayment(order)
} catch (error) {
  throw new Error(error.message) // Could expose stack traces, DB errors, etc.
}
```

### Validation at Boundaries

- ✅ Use Zod schemas at all entry points (API routes, forms, env vars)
- ✅ Validate early, fail fast
- ✅ Return structured validation errors

## Logging

### Use Winston for All Logging

**CRITICAL: Never use `console.log` or `console.error` in production code.**

- ❌ `console.log()`, `console.error()`, `console.warn()`
- ✅ Use Winston logger with appropriate log levels
- ✅ Structured logging with context

**Example:**

```typescript
// ✅ Good - Winston logger
import { logger } from '@/lib/logger'

logger.info('User login successful', { userId, email })
logger.error('Database connection failed', { error, host, port })
logger.warn('API rate limit approaching', { userId, requestCount })
logger.debug('Processing webhook payload', { webhookId, payload })

// ❌ Bad - Console logging
console.log('User logged in:', userId)
console.error('Error:', error)
```

### Log Levels

- **error**: Errors that need immediate attention
- **warn**: Warning conditions that might become errors
- **info**: Informational messages about normal operation
- **debug**: Detailed debugging information (development only)

### Structured Logging

```typescript
// ✅ Good - Structured with context
logger.error('Failed to create user', {
  error: error.message,
  stack: error.stack,
  email,
  timestamp: new Date().toISOString(),
})

// ❌ Bad - Unstructured
logger.error(`Failed to create user ${email}: ${error}`)
```

## Testing

### Test Philosophy

- **Vitest** for unit/integration tests
- **Playwright** for E2E tests (must use Gherkin `.feature` files)
- **React Testing Library** for component tests

### Test Definitions

**Unit Test:**

- Tests one module in isolation
- **Must mock all imports** (API calls, database, Redux, contexts, hooks, 3rd-party deps)

**Integration Test:**

- Tests interactions between our modules
- **May mock only** 3rd-party deps, API calls, database
- **Do not mock** internal modules under test

**Example:**

```typescript
// ✅ Good - Unit test with all mocks
describe('UserService.createUser (unit)', () => {
  it('should create user and send welcome email', async () => {
    const mockDb = vi.mocked(db)
    const mockEmailService = vi.mocked(emailService)

    mockDb.users.insert.mockResolvedValue({ id: '123', email: 'test@example.com' })

    await userService.createUser({ email: 'test@example.com' })

    expect(mockEmailService.sendWelcome).toHaveBeenCalledWith('test@example.com')
  })
})

// ✅ Good - Integration test with minimal mocks
describe('UserService + AuthService (integration)', () => {
  it('should create user and authenticate', async () => {
    // Only mock external services, not our internal modules
    const mockDb = createTestDb()

    const user = await userService.createUser({ email: 'test@example.com' })
    const token = await authService.authenticate(user.id)

    expect(token).toBeDefined()
  })
})
```

### E2E Tests with Playwright

**CRITICAL: ALL Playwright tests must use Gherkin syntax with `.feature` files.**

```gherkin
# features/auth/login.feature
Feature: User Login

  Scenario: Successful login with valid credentials
    Given I am on the login page
    When I enter email "user@example.com"
    And I enter password "SecurePass123"
    And I click the login button
    Then I should see the dashboard
    And I should see "Welcome back"
```

```typescript
// step-definitions/auth-steps.ts
import { Given, When, Then } from '@cucumber/cucumber'
import { expect } from '@playwright/test'

Given('I am on the login page', async function () {
  await this.page.goto('/login')
})

When('I enter email {string}', async function (email: string) {
  await this.page.fill('[data-testid="email-input"]', email)
})
```

### Test Best Practices

- ✅ Use descriptive test names (not just "it works")
- ✅ Use `data-testid` selectors for reliable element selection
- ✅ Prefer `waitFor` over hardcoded timeouts
- ✅ Keep tests hermetic (no network calls except controlled mocks)
- ✅ Use MSW (Mock Service Worker) for API mocking
- ✅ Clean up after tests (database, files, etc.)

## Security

### Authentication & Authorization

- ✅ Validate JWT tokens on all protected routes
- ✅ Check user ownership before operations
- ✅ Never trust client-provided user IDs

**Example:**

```typescript
// ✅ Good - Validates ownership
async function deleteProject(projectId: string, userId: string) {
  const project = await db.projects.findById(projectId)

  if (!project) {
    throw new NotFoundError('Project not found')
  }

  if (project.userId !== userId) {
    throw new ForbiddenError('You do not have permission to delete this project')
  }

  await db.projects.delete(projectId)
}

// ❌ Bad - No ownership check
async function deleteProject(projectId: string) {
  await db.projects.delete(projectId) // Anyone can delete any project!
}
```

### Input Validation

- ✅ Validate all external input with Zod
- ✅ Sanitize user input to prevent XSS
- ✅ Use parameterized queries to prevent SQL injection
- ✅ Rate limiting on authentication endpoints
- ✅ CORS configured with specific origins

### Secrets Management

- ❌ Never hardcode secrets in code
- ✅ Use environment variables for all secrets
- ✅ Validate environment variables with Zod at startup
- ✅ Never commit `.env` files (use `.env.example`)

## Performance

### General Guidelines

- ✅ Lazy-load routes by default
- ✅ Run bundle analyzer before adding heavy dependencies
- ✅ Memoize expensive calculations when profiling shows benefit
- ✅ Use `useMemo`, `useCallback`, `React.memo` judiciously (not by default)
- ✅ Code splitting configured in Vite for optimal chunks

### Database

- ✅ Add indexes for query patterns
- ✅ Use connection pooling (RDS Proxy for Lambda)
- ✅ Implement caching for frequently accessed data (Redis)
- ✅ Pagination for large result sets

### API Design

- ✅ Use appropriate HTTP status codes
- ✅ Implement cursor-based pagination for large datasets
- ✅ Support field selection to reduce payload size
- ✅ Use ETags for cache validation

## Documentation

### Code Comments

- ✅ Code should be self-documenting where possible
- ✅ Add comments for complex business logic
- ✅ Use JSDoc for public APIs and shared functions
- ❌ Don't comment obvious code

**Example:**

```typescript
// ✅ Good - Explains complex logic
/**
 * Calculates price with bulk discount tiers
 * Tier 1 (1-9): No discount
 * Tier 2 (10-49): 10% discount
 * Tier 3 (50+): 20% discount
 */
export function calculateBulkPrice(quantity: number, unitPrice: number): number {
  if (quantity >= 50) return quantity * unitPrice * 0.8
  if (quantity >= 10) return quantity * unitPrice * 0.9
  return quantity * unitPrice
}

// ❌ Bad - States the obvious
// This function adds two numbers together
function add(a: number, b: number): number {
  return a + b // Returns the sum
}
```

### API Documentation

- ✅ Document API changes in story files
- ✅ Include request/response examples
- ✅ Document error codes and meanings
- ✅ Keep OpenAPI/Swagger specs up to date

## Git Workflow

### Commit Messages

- ✅ Use conventional commits: `type(scope): message`
- ✅ Types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`
- ✅ Keep first line under 72 characters
- ✅ Add body for complex changes

**Example:**

```bash
✅ Good
feat(api): add wishlist CRUD endpoints

- Implement GET /api/wishlist for listing items
- Add POST /api/wishlist for creating items
- Include Redis caching with 5-minute TTL

❌ Bad
fixed stuff
updated code
wip
```

### Branch Strategy

- `main` - Production-ready code
- `feature/*` - New features
- `fix/*` - Bug fixes
- `refactor/*` - Code improvements

### Pre-Commit Checks

- ✅ Linting (`pnpm lint`)
- ✅ Type checking (`pnpm check-types`)
- ✅ Tests (`pnpm test`)
- ✅ Dependency sync (automatic via `lint-staged`)

### Creating Commits

**Only create commits when explicitly requested by user.**

When creating commits:

1. Run `git status` and `git diff` to see changes
2. Review recent commits with `git log` to match style
3. Draft a commit message that explains "why" not "what"
4. Add all relevant files with `git add`
5. Create commit with properly formatted message
6. Include co-author credit:

   ```
   🤖 Generated with [Claude Code](https://claude.com/claude-code)

   Co-Authored-By: Claude <noreply@anthropic.com>
   ```

### Pull Requests

**Only create PRs when explicitly requested by user.**

When creating PRs:

1. Analyze all commits that will be included
2. Create comprehensive PR summary with test plan
3. Use `gh pr create` with title and body
4. Return PR URL to user

## Change Management

### Database Migrations

- ❌ **Never modify existing migrations**
- ✅ Create new migrations for schema changes
- ✅ Include indexes for new query patterns
- ✅ Test rollback procedures

### Shared Package Changes

- ⚠️ **Discuss with human before modifying shared packages**
- ✅ Prefer composition over inheritance
- ✅ Keep modules closed for modification, open for extension (Open/Closed Principle)
- ✅ Use semantic versioning with changesets

## Enforcement

### Automated Checks

- **ESLint** - Code style and best practices
- **TypeScript** - Type safety
- **Prettier** - Code formatting
- **Vitest** - Unit and integration tests
- **Playwright** - E2E tests
- **Dependency sync** - Version consistency

### Pre-commit Hooks

```json
{
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
    "package.json": ["pnpm sync-deps:fix"]
  }
}
```

### CI/CD Pipeline

- ✅ Lint all code
- ✅ Type check all packages
- ✅ Run all tests
- ✅ Build all packages
- ✅ Check bundle sizes

## Design System

### LEGO-Inspired Theme

The application uses a LEGO-inspired design language with specific color palettes and animation patterns.

#### Primary Colors

- **Primary Colors**: Sky (500-600) and Teal (500-600)
- **Gradients**: `from-sky-500 to-teal-500` for CTAs and accents
- **Shadows**: `shadow-lg`, `shadow-xl` for depth and 3D LEGO-like appearance
- **Typography**: Bold headings, readable body text

#### Animation Patterns

```typescript
// LEGO brick building animation with Framer Motion
import { motion } from 'framer-motion'

const legoBrickVariants = {
  initial: { scale: 0, rotate: -180, opacity: 0 },
  animate: {
    scale: 1,
    rotate: 0,
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 260,
      damping: 20,
    },
  },
}

// Usage
<motion.div variants={legoBrickVariants} initial="initial" animate="animate">
  {/* LEGO brick content */}
</motion.div>
```

#### Color Usage

```typescript
// ✅ Good - Using Tailwind classes
<div className="bg-gradient-to-r from-sky-500 to-teal-500">
  <Button className="bg-sky-600 hover:bg-sky-700">Primary Action</Button>
</div>

// ❌ Bad - Hardcoded colors
<div style={{ background: '#0ea5e9' }}>
  <button style={{ backgroundColor: '#0284c7' }}>Primary Action</button>
</div>
```

## Common Pitfalls to Avoid

1. **Don't** manually edit package.json - use pnpm commands
2. **Don't** ignore TypeScript errors - fix them
3. **Don't** skip tests - maintain coverage thresholds
4. **Don't** use `any` without consideration (though it's allowed)
5. **Don't** forget accessibility attributes
6. **Don't** hardcode colors - use Tailwind classes
7. **Don't** ignore ESLint warnings - address them
8. **Don't** create barrel files (index.ts re-exports) - **PROHIBITED** - import directly from source files
9. **Don't** use TypeScript interfaces when Zod schemas provide better validation
10. **Don't** import shadcn components from individual paths - use @repo/ui package
11. **Don't** use console.log - use @repo/logger for all logging
12. **Don't** use classes - **PROHIBITED** - use functional programming patterns (pure functions, closures, composition)

## Key Dependencies

| Package              | Version  | Purpose                                 |
| -------------------- | -------- | --------------------------------------- |
| React                | 19.0.0   | Core framework with concurrent features |
| TanStack Router      | 1.130.2  | Type-safe routing                       |
| Redux Toolkit        | 2.8.2    | State management with RTK Query         |
| @repo/ui (shadcn/ui) | Latest   | Component library                       |
| @repo/logger         | Latest   | Centralized logging                     |
| Tailwind CSS         | 4.1.11   | Utility-first styling                   |
| Framer Motion        | 12.23.24 | Animations                              |
| AWS Amplify          | 6.15.7   | Authentication (Cognito)                |
| Vitest               | 3.0.5    | Testing framework                       |
| Zod                  | Latest   | Schema validation and type inference    |

## Resources

- **Monorepo Documentation**: `/CLAUDE.md`
- **Architecture**: `/docs/architecture/`
- **Testing Strategy**: Defined in this document
- **Dependency Management**: `DEPENDENCY_SYNC_LINT_STAGED.md`

---

**Last Updated**: 2025-11-29
**Version**: 1.1
