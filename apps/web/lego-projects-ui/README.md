# Lego Projects UI (Frontend)

This project is the **frontend UI** for the Lego Projects application. It is built with React, TypeScript, and Vite, and is deployed as a static site to AWS S3 using the Serverless Framework. 

> **Note:** All backend logic (APIs, data storage, etc.) is handled in the monorepo under [`apps/api/instructions-store`](../../api/instructions-store). This UI project does **not** contain any backend or serverless Lambda code. Keeping this separation ensures clarity and maintainability.

---

## Project Structure

The application is organized into feature-based modules within the `pages` directory, using nested routes with layout wrappers:

```
pages/
├── Auth/
│   ├── index.tsx              # Auth layout wrapper
│   ├── Login.tsx              # /auth/login
│   ├── Signup.tsx             # /auth/signup
│   └── ForgotPassword.tsx     # /auth/forgot-password
├── Instructions/
│   ├── index.tsx              # Instructions layout wrapper
│   ├── InstructionsList.tsx   # /instructions (main list)
│   ├── CreateInstruction.tsx  # /instructions/create
│   ├── InstructionDetail.tsx  # /instructions/:id
│   └── EditInstruction.tsx    # /instructions/:id/edit
├── Inspiration/
│   ├── index.tsx              # Inspiration layout wrapper
│   ├── InspirationGallery.tsx # /inspiration (main gallery)
│   ├── InspirationDetail.tsx  # /inspiration/:id
│   └── UploadInspiration.tsx  # /inspiration/upload
└── Profile/
    ├── index.tsx              # Profile layout wrapper
    ├── ProfileMain.tsx        # /profile (main profile)
    ├── ProfileSettings.tsx    # /profile/settings
    ├── UserCollections.tsx    # /profile/collections
    └── ActivityHistory.tsx    # /profile/history
```

### URL Structure
The application uses module-based URLs for clear hierarchy and SEO-friendly paths:

```
{BASE_URL}/auth/login
{BASE_URL}/auth/signup
{BASE_URL}/auth/forgot-password

{BASE_URL}/instructions
{BASE_URL}/instructions/create
{BASE_URL}/instructions/{id}
{BASE_URL}/instructions/{id}/edit

{BASE_URL}/inspiration
{BASE_URL}/inspiration/{id}
{BASE_URL}/inspiration/upload

{BASE_URL}/profile
{BASE_URL}/profile/settings
{BASE_URL}/profile/collections
{BASE_URL}/profile/history
```

### Layout Pattern
Each module uses a layout wrapper (`index.tsx`) that provides shared UI elements:

```tsx
// pages/Auth/index.tsx
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth-layout">
      <AuthHeader />
      {children}
      <AuthFooter />
    </div>
  );
}

// pages/Instructions/index.tsx
export default function InstructionsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="instructions-layout">
      <InstructionsSidebar />
      <main>{children}</main>
    </div>
  );
}
```

### Router Setup
Routes are configured with nested structure for clean organization:

```tsx
<Routes>
  <Route path="/auth" element={<AuthLayout />}>
    <Route index element={<Login />} />
    <Route path="login" element={<Login />} />
    <Route path="signup" element={<Signup />} />
    <Route path="forgot-password" element={<ForgotPassword />} />
  </Route>
  
  <Route path="/instructions" element={<InstructionsLayout />}>
    <Route index element={<InstructionsList />} />
    <Route path="create" element={<CreateInstruction />} />
    <Route path=":id" element={<InstructionDetail />} />
    <Route path=":id/edit" element={<EditInstruction />} />
  </Route>
</Routes>
```

### Key Organization Principles:
- **Module-based structure**: Each feature (Auth, Instructions, Inspiration, Profile) has its own directory
- **Layout wrappers**: Shared UI elements per module using `index.tsx` with children
- **Nested routes**: Clean URL hierarchy with React Router nested routing
- **Component naming**: PascalCase for component files following React conventions
- **Feature separation**: Clear boundaries between different app functionalities
- **Scalable**: Easy to add new features and maintain existing ones

---

## Deployment

The UI is deployed as a static site to an S3 bucket using the Serverless Framework and the `serverless-s3-sync` plugin. There are no Lambda functions or API Gateway integrations in this project.

**To deploy:**

1. Build the project:
   ```sh
   pnpm build
   ```
2. Deploy to S3:
   ```sh
   npx serverless deploy
   ```

This will upload the contents of the `dist/` directory to the configured S3 bucket.

---

# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default tseslint.config([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      ...tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      ...tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      ...tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default tseslint.config([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
