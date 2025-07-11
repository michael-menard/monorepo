# Template Package

This is a template package for creating new packages in the monorepo. It includes:

## 🚀 What's Included

### **Dependencies:**
- **React 19** with TypeScript support
- **Framer Motion** for animations
- **Redux Toolkit (RTK)** for state management
- **React Redux** for React integration
- **Shadcn/ui utilities** (class-variance-authority, clsx, tailwind-merge)
- **Lucide React** for icons

### **Development Tools:**
- **TypeScript** with strict configuration
- **Vitest** for fast unit testing
- **Testing Library** for React component testing
- **ESLint** for code quality
- **JSDOM** for browser environment simulation

### **Testing Setup:**
- Vitest configuration with React support
- Testing Library setup with jest-dom matchers
- Example test files
- Coverage reporting

### **Redux Setup:**
- RTK store configuration
- Example slice with TypeScript
- Typed hooks (useAppDispatch, useAppSelector)

## 📁 File Structure

```
packages/template/
├── src/
│   ├── __tests__/
│   │   └── example.test.ts          # Example tests
│   ├── store/
│   │   ├── index.ts                 # Redux store setup
│   │   └── exampleSlice.ts          # Example RTK slice
│   └── index.ts                     # Main exports
├── vitest.config.ts                 # Vitest configuration
├── tsconfig.json                    # TypeScript configuration
├── package.json                     # Dependencies and scripts
└── README.md                        # This file
```

## 🛠️ How to Use

### **1. Copy the Template:**
```bash
cp -r packages/template packages/my-new-package
```

### **2. Update Package Name:**
Edit `package.json` and change:
```json
{
  "name": "@repo/my-new-package"
}
```

### **3. Install Dependencies:**
```bash
cd packages/my-new-package
pnpm install
```

### **4. Run Tests:**
```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with UI
pnpm test:ui

# Run tests with coverage
pnpm test:coverage
```

### **5. Type Checking:**
```bash
pnpm check-types
```

### **6. Linting:**
```bash
pnpm lint
```

## 🧪 Testing Examples

### **Unit Tests:**
```typescript
import { describe, it, expect } from 'vitest'

describe('My Function', () => {
  it('should work correctly', () => {
    expect(myFunction()).toBe(expected)
  })
})
```

### **React Component Tests:**
```typescript
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { MyComponent } from './MyComponent'

describe('MyComponent', () => {
  it('should render correctly', () => {
    render(<MyComponent />)
    expect(screen.getByText('Hello')).toBeInTheDocument()
  })
})
```

## 🔄 Redux Usage

### **Using the Store:**
```typescript
import { useAppDispatch, useAppSelector } from './store'
import { increment, decrement } from './store/exampleSlice'

function MyComponent() {
  const dispatch = useAppDispatch()
  const count = useAppSelector(state => state.example.count)

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => dispatch(increment())}>+</button>
      <button onClick={() => dispatch(decrement())}>-</button>
    </div>
  )
}
```

### **Creating New Slices:**
```typescript
import { createSlice, PayloadAction } from '@reduxjs/toolkit'

interface MyState {
  value: string
}

const initialState: MyState = {
  value: ''
}

const mySlice = createSlice({
  name: 'my',
  initialState,
  reducers: {
    setValue: (state, action: PayloadAction<string>) => {
      state.value = action.payload
    }
  }
})

export const { setValue } = mySlice.actions
export default mySlice.reducer
```

## 📝 Next Steps

1. **Replace example files** with your actual code
2. **Add your specific dependencies** to `package.json`
3. **Update the store** with your actual slices
4. **Write tests** for your components and functions
5. **Export your components** from `src/index.ts`

## 🔧 Configuration

### **Vitest Configuration:**
- Environment: jsdom (browser simulation)
- Setup files: `src/test/setup.ts`
- Path aliases: `@` points to `./src`

### **TypeScript Configuration:**
- Extends: `@repo/typescript-config/react-library.json`
- Includes: Vitest globals and jest-dom types
- Output: `dist/` directory

### **ESLint Configuration:**
- Extends: `@repo/eslint-config`
- React-specific rules enabled 