# Frontend-Backend API Analysis

This document analyzes the differences between the frontend auth forms in `lego-moc-instructions-app` and the backend API specification in the auth service.

## 📊 **Summary of Differences**

| Endpoint | Frontend Fields | Backend Fields | Mismatch |
|----------|----------------|----------------|----------|
| `/auth/sign-up` | `firstName`, `lastName`, `email`, `password`, `confirmPassword` | `email`, `password`, `name` | **Major** |
| `/auth/login` | `email`, `password` | `email`, `password` | ✅ **Match** |
| `/auth/forgot-password` | `email` | `email` | ✅ **Match** |
| `/auth/reset-password/{token}` | `password`, `confirmPassword` | `password` | **Minor** |
| `/auth/verify-email` | `code` | `code` | ✅ **Match** |
| `/auth/resend-verification` | `email` | `email` | ✅ **Match** |

## 🔍 **Detailed Analysis**

### 1. **Signup Endpoint (`POST /auth/sign-up`)**

#### **Frontend Implementation**
```typescript
// apps/web/lego-moc-instructions-app/src/pages/auth/SignupPage/index.tsx
const SignupSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})
```

#### **Backend API Specification**
```yaml
# apps/api/auth-service/__docs__/swagger.yaml
requestBody:
  schema:
    type: object
    required:
      - email
      - password
      - name
    properties:
      email:
        type: string
        format: email
      password:
        type: string
        minLength: 8
      name:
        type: string
        minLength: 2
```

#### **Backend Controller Implementation**
```typescript
// apps/api/auth-service/controllers/auth.controller.ts
export const signup = async (req: Request, res: Response) => {
  const { email, password, name } = req.body;
  // ...
}
```

#### **Key Differences**
- **Field Structure**: Frontend uses separate `firstName`/`lastName`, backend expects single `name`
- **Password Length**: Frontend validates 6+ chars, backend expects 8+ chars
- **Password Confirmation**: Frontend includes `confirmPassword`, backend doesn't expect it
- **Validation**: Frontend has client-side password matching, backend doesn't validate this

### 2. **Login Endpoint (`POST /auth/login`)**

#### **Frontend Implementation**
```typescript
// apps/web/lego-moc-instructions-app/src/pages/auth/LoginPage/index.tsx
const LoginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})
```

#### **Backend API Specification**
```yaml
# apps/api/auth-service/__docs__/swagger.yaml
requestBody:
  schema:
    type: object
    required:
      - email
      - password
    properties:
      email:
        type: string
        format: email
      password:
        type: string
        # No minLength specified in swagger
```

#### **Key Differences**
- **Password Validation**: Frontend validates 6+ chars, backend swagger doesn't specify minimum
- **Field Structure**: ✅ **Match** - both expect `email` and `password`

### 3. **Reset Password Endpoint (`POST /auth/reset-password/{token}`)**

#### **Frontend Implementation**
```typescript
// apps/web/lego-moc-instructions-app/src/pages/auth/ResetPasswordPage/index.tsx
const ResetPasswordSchema = z.object({
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})
```

#### **Backend API Specification**
```yaml
# apps/api/auth-service/__docs__/swagger.yaml
requestBody:
  schema:
    type: object
    required:
      - password
    properties:
      password:
        type: string
        minLength: 8
```

#### **Key Differences**
- **Password Length**: Frontend validates 6+ chars, backend expects 8+ chars
- **Password Confirmation**: Frontend includes `confirmPassword`, backend doesn't expect it
- **Validation**: Frontend has client-side password matching, backend doesn't validate this

### 4. **Email Verification Endpoint (`POST /auth/verify-email`)**

#### **Frontend Implementation**
```typescript
// apps/web/lego-moc-instructions-app/src/pages/auth/EmailVerificationPage/index.tsx
const EmailVerificationSchema = z.object({
  code: z.string().min(6, 'Verification code must be 6 characters').max(6, 'Verification code must be 6 characters'),
})
```

#### **Backend API Specification**
```yaml
# apps/api/auth-service/__docs__/swagger.yaml
requestBody:
  schema:
    type: object
    required:
      - code
    properties:
      code:
        type: string
        pattern: '^[0-9]{6}$'
```

#### **Key Differences**
- **Validation**: Frontend validates exact 6 characters, backend uses regex pattern
- **Field Structure**: ✅ **Match** - both expect `code`

### 5. **Forgot Password Endpoint (`POST /auth/forgot-password`)**

#### **Frontend Implementation**
```typescript
// apps/web/lego-moc-instructions-app/src/pages/auth/ForgotPasswordPage/index.tsx
const ForgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
})
```

#### **Backend API Specification**
```yaml
# apps/api/auth-service/__docs__/swagger.yaml
requestBody:
  schema:
    type: object
    required:
      - email
    properties:
      email:
        type: string
        format: email
```

#### **Key Differences**
- **Field Structure**: ✅ **Match** - both expect `email`

## 🚨 **Critical Issues**

### **1. Signup Field Mismatch**
The most critical issue is the signup endpoint where:
- Frontend sends: `{ firstName: "John", lastName: "Doe", email: "...", password: "...", confirmPassword: "..." }`
- Backend expects: `{ name: "John Doe", email: "...", password: "..." }`

**Impact**: This will cause the signup to fail as the backend won't receive the expected `name` field.

### **2. Password Length Inconsistency**
- Frontend validates: 6+ characters
- Backend expects: 8+ characters (in swagger docs)

**Impact**: Users might create passwords that pass frontend validation but fail backend validation.

### **3. Missing Password Confirmation**
- Frontend sends: `confirmPassword` field
- Backend ignores: `confirmPassword` field

**Impact**: No server-side validation that passwords match, relying only on client-side validation.

## 📋 **Validation Rules Comparison**

| Field | Frontend Rule | Backend Rule | Status |
|-------|---------------|--------------|---------|
| Email | Valid email format | Valid email format | ✅ Match |
| Password (Signup) | 6+ characters | 8+ characters | ❌ Mismatch |
| Password (Login) | 6+ characters | No minimum specified | ⚠️ Unclear |
| Password (Reset) | 6+ characters | 8+ characters | ❌ Mismatch |
| First Name | 1+ characters | N/A (expects `name`) | ❌ Mismatch |
| Last Name | 1+ characters | N/A (expects `name`) | ❌ Mismatch |
| Verification Code | Exactly 6 characters | 6-digit pattern | ✅ Match |

## 🔧 **Recommended Solutions**

### **Option 1: Update Backend to Match Frontend (Recommended)**
1. Modify User model to include `firstName` and `lastName` fields
2. Update signup controller to handle separate name fields
3. Change password validation to 6+ characters
4. Add password confirmation validation

### **Option 2: Update Frontend to Match Backend**
1. Combine first/last name into single `name` field
2. Increase password minimum to 8 characters
3. Remove `confirmPassword` field from API calls

### **Option 3: Create Adapter Layer**
1. Keep both implementations as-is
2. Create middleware to transform frontend requests to backend format
3. Transform backend responses to frontend format

## 📁 **Files Analyzed**

### **Frontend Files**
- `apps/web/lego-moc-instructions-app/src/pages/auth/LoginPage/index.tsx`
- `apps/web/lego-moc-instructions-app/src/pages/auth/SignupPage/index.tsx`
- `apps/web/lego-moc-instructions-app/src/pages/auth/ForgotPasswordPage/index.tsx`
- `apps/web/lego-moc-instructions-app/src/pages/auth/ResetPasswordPage/index.tsx`
- `apps/web/lego-moc-instructions-app/src/pages/auth/EmailVerificationPage/index.tsx`

### **Backend Files**
- `apps/api/auth-service/controllers/auth.controller.ts`
- `apps/api/auth-service/models/User.ts`
- `apps/api/auth-service/routes/auth.routes.ts`
- `apps/api/auth-service/__docs__/swagger.yaml`

## 🎯 **Priority Issues**

1. **HIGH**: Signup field mismatch (will cause signup to fail)
2. **MEDIUM**: Password length inconsistency (may cause validation errors)
3. **LOW**: Missing password confirmation validation (security concern)

## 📝 **Notes**

- All frontend forms currently use TODO placeholders for API calls
- Backend implementation appears to be functional but may not handle frontend's field structure
- Swagger documentation may not fully reflect actual backend implementation
- Frontend validation is more comprehensive than backend validation 