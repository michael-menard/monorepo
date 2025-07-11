# Frontend Template Package

A secure, modern frontend template with TypeScript, Redux Toolkit, and comprehensive security features.

## 🚀 What's Included

### **Core Dependencies:**
- **React 19** - Latest React with concurrent features
- **TypeScript** - Type safety and better DX
- **Redux Toolkit (RTK)** - State management
- **Framer Motion** - Animations
- **Tailwind CSS** - Utility-first CSS framework

### **Security Features:**
- **Axios with CSRF Protection** - Secure HTTP client
- **Helmet** - Security headers
- **Winston** - Structured logging
- **zxcvbn** - Password strength validation
- **ESLint Security Plugin** - Security-focused linting

### **Form & Validation:**
- **React Hook Form** - Type-safe form handling
- **Zod** - Schema validation
- **@hookform/resolvers** - Form validation integration

### **Routing & Navigation:**
- **React Router DOM** - Client-side routing
- **Query String** - URL parameter handling

### **Error Handling:**
- **React Error Boundary** - Graceful error handling

### **Date & Time:**
- **date-fns** - Lightweight date utilities

### **Development Tools:**
- **Vitest** - Fast unit testing
- **ESLint** - Code quality with security rules
- **PostCSS & Autoprefixer** - CSS processing

## 📁 File Structure

```
packages/web/template-frontend/
├── src/
│   ├── components/          # React components
│   ├── store/              # Redux store setup
│   ├── utils/              # Utility functions
│   │   ├── axios.ts        # Secure Axios configuration
│   │   ├── logger.ts       # Winston logging
│   │   ├── helmet.ts       # Security headers
│   │   ├── password-strength.ts # zxcvbn password validation
│   │   ├── forms.ts        # React Hook Form + Zod utilities
│   │   ├── dates.ts        # date-fns utilities
│   │   └── error-boundary.tsx # Error boundary component
│   └── __tests__/          # Test files
├── tailwind.config.js      # Tailwind configuration
├── postcss.config.js       # PostCSS configuration
├── eslint.config.js        # ESLint with security rules
├── package.json            # Dependencies and scripts
└── README.md              # This file
```

## 🛠️ How to Use

### **1. Copy the Template:**
```bash
cp -r packages/web/template-frontend packages/web/my-frontend-app
```

### **2. Update Package Name:**
Edit `package.json`:
```json
{
  "name": "@repo/my-frontend-app"
}
```

### **3. Install Dependencies:**
```bash
cd packages/web/my-frontend-app
pnpm install
```

### **4. Configure Environment:**
Create `.env` file:
```env
VITE_API_URL=http://localhost:3000
VITE_CSRF_TOKEN=your-csrf-token
```

## 🔒 Security Features

### **Secure Axios Configuration**
```typescript
import { secureAxios } from './utils/axios';

// Make secure API calls
const response = await secureAxios.get('/api/users');
```

**Features:**
- ✅ CSRF token management
- ✅ Security headers
- ✅ Error handling
- ✅ Request/response interceptors

### **Password Strength Validation**
```typescript
import { checkPasswordStrength, validatePassword } from './utils/password-strength';

const strength = checkPasswordStrength('myPassword123!');
console.log(strength.score); // 0-4

const validation = validatePassword('myPassword123!');
console.log(validation.isValid); // true/false
```

**Features:**
- ✅ zxcvbn algorithm
- ✅ Custom validation rules
- ✅ Strength scoring
- ✅ Feedback and suggestions

### **Structured Logging**
```typescript
import { logger, logUserAction, logSecurityEvent } from './utils/logger';

logger.info('Application started');
logUserAction('login', { userId: '123' });
logSecurityEvent('failed_login', { ip: '192.168.1.1' });
```

**Features:**
- ✅ Winston logging
- ✅ Structured JSON output
- ✅ Security event tracking
- ✅ Performance monitoring

### **Security Headers**
```typescript
import { securityHeaders, applySecurityHeaders } from './utils/helmet';

// Apply to HTML
const secureHtml = applySecurityHeaders(html);
```

**Features:**
- ✅ Content Security Policy
- ✅ XSS Protection
- ✅ Clickjacking Prevention
- ✅ HSTS

### **Type-Safe Forms**
```typescript
import { useZodForm, loginSchema } from './utils/forms';

const form = useZodForm(loginSchema);

// Form is fully typed with validation
const onSubmit = (data: LoginFormData) => {
  console.log(data.email, data.password);
};
```

**Features:**
- ✅ Type-safe form handling
- ✅ Zod schema validation
- ✅ Error handling
- ✅ Performance optimized

### **Date Utilities**
```typescript
import { formatDate, formatRelativeDate, isValidDate } from './utils/dates';

const formatted = formatDate(new Date(), 'MMM dd, yyyy');
const relative = formatRelativeDate(new Date());
const isValid = isValidDate('2023-12-25');
```

**Features:**
- ✅ Lightweight and tree-shakeable
- ✅ Type-safe date handling
- ✅ Relative date formatting
- ✅ Date validation

### **Error Boundaries**
```typescript
import { ErrorBoundary } from './utils/error-boundary';

function App() {
  return (
    <ErrorBoundary>
      <YourApp />
    </ErrorBoundary>
  );
}
```

**Features:**
- ✅ Graceful error handling
- ✅ Error logging
- ✅ User-friendly fallback
- ✅ Development error details

## 🧪 Testing Examples

### **Component Testing:**
```typescript
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MyComponent } from './MyComponent';

describe('MyComponent', () => {
  it('should render correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});
```

### **Redux Testing:**
```typescript
import { configureStore } from '@reduxjs/toolkit';
import { render } from '@testing-library/react';
import { Provider } from 'react-redux';
import { describe, it, expect } from 'vitest';

const renderWithProviders = (component: React.ReactElement) => {
  const store = configureStore({
    reducer: {
      // your reducers
    },
  });

  return render(
    <Provider store={store}>
      {component}
    </Provider>
  );
};
```

## 📊 Redux Store Setup

### **Store Configuration:**
```typescript
// src/store/index.ts
import { configureStore } from '@reduxjs/toolkit';
import userSlice from './userSlice';

export const store = configureStore({
  reducer: {
    user: userSlice,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

### **Slice Example:**
```typescript
// src/store/userSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface UserState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

const initialState: UserState = {
  user: null,
  loading: false,
  error: null,
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
    },
  },
});

export const { setUser, setLoading, setError } = userSlice.actions;
export default userSlice.reducer;
```

## 🔧 Development Commands

```bash
pnpm dev              # Start development server
pnpm build            # Build for production
pnpm test             # Run tests
pnpm test:watch       # Run tests in watch mode
pnpm test:ui          # Run tests with UI
pnpm test:coverage    # Run tests with coverage
pnpm lint             # Run ESLint
pnpm check-types      # Run TypeScript check
```

## 📝 Environment Variables

Create a `.env` file:
```env
# API Configuration
VITE_API_URL=http://localhost:3000
VITE_CSRF_TOKEN=your-csrf-token

# Security
VITE_CSP_NONCE=your-csp-nonce
VITE_SECURE_COOKIES=true

# Logging
VITE_LOG_LEVEL=info
VITE_ENABLE_LOGGING=true
```

## 🔒 Security Best Practices

### **1. CSRF Protection**
- Always include CSRF tokens in requests
- Validate tokens on the server
- Use secure cookie settings

### **2. Content Security Policy**
- Restrict script sources
- Prevent XSS attacks
- Control resource loading

### **3. Password Security**
- Use zxcvbn for strength checking
- Implement rate limiting
- Hash passwords securely

### **4. Logging Security**
- Don't log sensitive data
- Use structured logging
- Monitor security events

### **5. Headers Security**
- Set security headers
- Prevent clickjacking
- Enable HSTS

## 🚨 Security Checklist

- [ ] CSRF tokens implemented
- [ ] Security headers configured
- [ ] Password strength validation
- [ ] Input sanitization
- [ ] Error handling secure
- [ ] Logging configured
- [ ] HTTPS enforced
- [ ] Dependencies updated
- [ ] Security linting enabled
- [ ] Tests cover security scenarios

## 📚 Additional Resources

- [Redux Toolkit Documentation](https://redux-toolkit.js.org/)
- [Tailwind CSS Documentation](https://tailwindcss.com/)
- [Vitest Documentation](https://vitest.dev/)
- [Security Headers Guide](https://owasp.org/www-project-secure-headers/)
- [zxcvbn Password Strength](https://github.com/dropbox/zxcvbn) 