import {z} from 'zod'

export declare const UserSchema: z.ZodObject<
  {
    id: z.ZodString
    email: z.ZodString
    name: z.ZodString
    avatarUrl: z.ZodOptional<z.ZodString>
    emailVerified: z.ZodOptional<z.ZodBoolean>
    isVerified: z.ZodOptional<z.ZodBoolean>
    createdAt: z.ZodString
    updatedAt: z.ZodString
    role: z.ZodString
  },
  'strip',
  z.ZodTypeAny,
  {
    name?: string
    email?: string
    id?: string
    role?: string
    avatarUrl?: string
    emailVerified?: boolean
    isVerified?: boolean
    createdAt?: string
    updatedAt?: string
  },
  {
    name?: string
    email?: string
    id?: string
    role?: string
    avatarUrl?: string
    emailVerified?: boolean
    isVerified?: boolean
    createdAt?: string
    updatedAt?: string
  }
>
export declare const AuthTokensSchema: z.ZodObject<
  {
    accessToken: z.ZodString
    refreshToken: z.ZodString
    expiresIn: z.ZodNumber
  },
  'strip',
  z.ZodTypeAny,
  {
    accessToken?: string
    refreshToken?: string
    expiresIn?: number
  },
  {
    accessToken?: string
    refreshToken?: string
    expiresIn?: number
  }
>
export declare const AuthResponseSchema: z.ZodObject<
  {
    success: z.ZodBoolean
    message: z.ZodString
    data: z.ZodObject<
      {
        user: z.ZodObject<
          {
            id: z.ZodString
            email: z.ZodString
            name: z.ZodString
            avatarUrl: z.ZodOptional<z.ZodString>
            emailVerified: z.ZodOptional<z.ZodBoolean>
            isVerified: z.ZodOptional<z.ZodBoolean>
            createdAt: z.ZodString
            updatedAt: z.ZodString
            role: z.ZodString
          },
          'strip',
          z.ZodTypeAny,
          {
            name?: string
            email?: string
            id?: string
            role?: string
            avatarUrl?: string
            emailVerified?: boolean
            isVerified?: boolean
            createdAt?: string
            updatedAt?: string
          },
          {
            name?: string
            email?: string
            id?: string
            role?: string
            avatarUrl?: string
            emailVerified?: boolean
            isVerified?: boolean
            createdAt?: string
            updatedAt?: string
          }
        >
        tokens: z.ZodOptional<
          z.ZodObject<
            {
              accessToken: z.ZodString
              refreshToken: z.ZodString
              expiresIn: z.ZodNumber
            },
            'strip',
            z.ZodTypeAny,
            {
              accessToken?: string
              refreshToken?: string
              expiresIn?: number
            },
            {
              accessToken?: string
              refreshToken?: string
              expiresIn?: number
            }
          >
        >
      },
      'strip',
      z.ZodTypeAny,
      {
        user?: {
          name?: string
          email?: string
          id?: string
          role?: string
          avatarUrl?: string
          emailVerified?: boolean
          isVerified?: boolean
          createdAt?: string
          updatedAt?: string
        }
        tokens?: {
          accessToken?: string
          refreshToken?: string
          expiresIn?: number
        }
      },
      {
        user?: {
          name?: string
          email?: string
          id?: string
          role?: string
          avatarUrl?: string
          emailVerified?: boolean
          isVerified?: boolean
          createdAt?: string
          updatedAt?: string
        }
        tokens?: {
          accessToken?: string
          refreshToken?: string
          expiresIn?: number
        }
      }
    >
  },
  'strip',
  z.ZodTypeAny,
  {
    data?: {
      user?: {
        name?: string
        email?: string
        id?: string
        role?: string
        avatarUrl?: string
        emailVerified?: boolean
        isVerified?: boolean
        createdAt?: string
        updatedAt?: string
      }
      tokens?: {
        accessToken?: string
        refreshToken?: string
        expiresIn?: number
      }
    }
    message?: string
    success?: boolean
  },
  {
    data?: {
      user?: {
        name?: string
        email?: string
        id?: string
        role?: string
        avatarUrl?: string
        emailVerified?: boolean
        isVerified?: boolean
        createdAt?: string
        updatedAt?: string
      }
      tokens?: {
        accessToken?: string
        refreshToken?: string
        expiresIn?: number
      }
    }
    message?: string
    success?: boolean
  }
>
export declare const LoginRequestSchema: z.ZodObject<
  {
    email: z.ZodString
    password: z.ZodString
  },
  'strip',
  z.ZodTypeAny,
  {
    email?: string
    password?: string
  },
  {
    email?: string
    password?: string
  }
>
export declare const SignupRequestSchema: z.ZodObject<
  {
    email: z.ZodString
    password: z.ZodString
    firstName: z.ZodString
    lastName: z.ZodString
  },
  'strip',
  z.ZodTypeAny,
  {
    email?: string
    password?: string
    firstName?: string
    lastName?: string
  },
  {
    email?: string
    password?: string
    firstName?: string
    lastName?: string
  }
>
export declare const ResetPasswordRequestSchema: z.ZodObject<
  {
    email: z.ZodString
  },
  'strip',
  z.ZodTypeAny,
  {
    email?: string
  },
  {
    email?: string
  }
>
export declare const ConfirmResetRequestSchema: z.ZodObject<
  {
    token: z.ZodString
    newPassword: z.ZodString
  },
  'strip',
  z.ZodTypeAny,
  {
    token?: string
    newPassword?: string
  },
  {
    token?: string
    newPassword?: string
  }
>
export declare const VerifyEmailRequestSchema: z.ZodObject<
  {
    code: z.ZodString
  },
  'strip',
  z.ZodTypeAny,
  {
    code?: string
  },
  {
    code?: string
  }
>
export declare const AuthErrorSchema: z.ZodObject<
  {
    success: z.ZodLiteral<false>
    message: z.ZodString
    errors: z.ZodOptional<
      z.ZodArray<
        z.ZodObject<
          {
            field: z.ZodString
            message: z.ZodString
          },
          'strip',
          z.ZodTypeAny,
          {
            message?: string
            field?: string
          },
          {
            message?: string
            field?: string
          }
        >,
        'many'
      >
    >
  },
  'strip',
  z.ZodTypeAny,
  {
    message?: string
    errors?: {
      message?: string
      field?: string
    }[]
    success?: false
  },
  {
    message?: string
    errors?: {
      message?: string
      field?: string
    }[]
    success?: false
  }
>
export declare const AuthStateSchema: z.ZodObject<
  {
    user: z.ZodNullable<
      z.ZodObject<
        {
          id: z.ZodString
          email: z.ZodString
          name: z.ZodString
          avatarUrl: z.ZodOptional<z.ZodString>
          emailVerified: z.ZodOptional<z.ZodBoolean>
          isVerified: z.ZodOptional<z.ZodBoolean>
          createdAt: z.ZodString
          updatedAt: z.ZodString
          role: z.ZodString
        },
        'strip',
        z.ZodTypeAny,
        {
          name?: string
          email?: string
          id?: string
          role?: string
          avatarUrl?: string
          emailVerified?: boolean
          isVerified?: boolean
          createdAt?: string
          updatedAt?: string
        },
        {
          name?: string
          email?: string
          id?: string
          role?: string
          avatarUrl?: string
          emailVerified?: boolean
          isVerified?: boolean
          createdAt?: string
          updatedAt?: string
        }
      >
    >
    tokens: z.ZodNullable<
      z.ZodObject<
        {
          accessToken: z.ZodString
          refreshToken: z.ZodString
          expiresIn: z.ZodNumber
        },
        'strip',
        z.ZodTypeAny,
        {
          accessToken?: string
          refreshToken?: string
          expiresIn?: number
        },
        {
          accessToken?: string
          refreshToken?: string
          expiresIn?: number
        }
      >
    >
    isAuthenticated: z.ZodBoolean
    isLoading: z.ZodBoolean
    isCheckingAuth: z.ZodOptional<z.ZodBoolean>
    error: z.ZodNullable<z.ZodString>
    message: z.ZodOptional<z.ZodNullable<z.ZodString>>
  },
  'strip',
  z.ZodTypeAny,
  {
    user?: {
      name?: string
      email?: string
      id?: string
      role?: string
      avatarUrl?: string
      emailVerified?: boolean
      isVerified?: boolean
      createdAt?: string
      updatedAt?: string
    }
    error?: string
    message?: string
    tokens?: {
      accessToken?: string
      refreshToken?: string
      expiresIn?: number
    }
    isAuthenticated?: boolean
    isLoading?: boolean
    isCheckingAuth?: boolean
  },
  {
    user?: {
      name?: string
      email?: string
      id?: string
      role?: string
      avatarUrl?: string
      emailVerified?: boolean
      isVerified?: boolean
      createdAt?: string
      updatedAt?: string
    }
    error?: string
    message?: string
    tokens?: {
      accessToken?: string
      refreshToken?: string
      expiresIn?: number
    }
    isAuthenticated?: boolean
    isLoading?: boolean
    isCheckingAuth?: boolean
  }
>
export interface User extends z.infer<typeof UserSchema> {}
export interface AuthTokens extends z.infer<typeof AuthTokensSchema> {}
export interface AuthResponse extends z.infer<typeof AuthResponseSchema> {}
export interface LoginRequest extends z.infer<typeof LoginRequestSchema> {}
export interface SignupRequest extends z.infer<typeof SignupRequestSchema> {}
export interface ResetPasswordRequest extends z.infer<typeof ResetPasswordRequestSchema> {}
export interface ConfirmResetRequest extends z.infer<typeof ConfirmResetRequestSchema> {}
export interface VerifyEmailRequest extends z.infer<typeof VerifyEmailRequestSchema> {}
export interface AuthError extends z.infer<typeof AuthErrorSchema> {}
export interface AuthState extends z.infer<typeof AuthStateSchema> {}
