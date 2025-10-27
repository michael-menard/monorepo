import React from 'react'
import {z} from 'zod'

declare global {
  interface Window {
    URL: {
      createObjectURL: (file: File) => string
    }
  }
}
declare const AppAvatarSchema: z.ZodObject<
  {
    avatarUrl: z.ZodOptional<z.ZodString>
    userName: z.ZodOptional<z.ZodString>
    userEmail: z.ZodOptional<z.ZodString>
    onAvatarUpload: z.ZodOptional<
      z.ZodFunction<
        z.ZodTuple<[z.ZodType<File, z.ZodTypeDef, File>], z.ZodUnknown>,
        z.ZodPromise<z.ZodVoid>
      >
    >
    onProfileClick: z.ZodOptional<z.ZodFunction<z.ZodTuple<[], z.ZodUnknown>, z.ZodVoid>>
    onLogout: z.ZodOptional<z.ZodFunction<z.ZodTuple<[], z.ZodUnknown>, z.ZodVoid>>
    onUserSettingsClick: z.ZodOptional<z.ZodFunction<z.ZodTuple<[], z.ZodUnknown>, z.ZodVoid>>
    className: z.ZodOptional<z.ZodString>
    size: z.ZodDefault<z.ZodEnum<['sm', 'md', 'lg']>>
    showEditButton: z.ZodDefault<z.ZodBoolean>
    disabled: z.ZodDefault<z.ZodBoolean>
    clickable: z.ZodDefault<z.ZodBoolean>
  },
  'strip',
  z.ZodTypeAny,
  {
    size: 'sm' | 'md' | 'lg'
    disabled: boolean
    showEditButton: boolean
    clickable: boolean
    className?: string | undefined
    avatarUrl?: string | undefined
    userName?: string | undefined
    userEmail?: string | undefined
    onAvatarUpload?: ((args_0: File, ...args: unknown[]) => Promise<void>) | undefined
    onProfileClick?: ((...args: unknown[]) => void) | undefined
    onLogout?: ((...args: unknown[]) => void) | undefined
    onUserSettingsClick?: ((...args: unknown[]) => void) | undefined
  },
  {
    className?: string | undefined
    size?: 'sm' | 'md' | 'lg' | undefined
    disabled?: boolean | undefined
    avatarUrl?: string | undefined
    userName?: string | undefined
    userEmail?: string | undefined
    onAvatarUpload?: ((args_0: File, ...args: unknown[]) => Promise<void>) | undefined
    onProfileClick?: ((...args: unknown[]) => void) | undefined
    onLogout?: ((...args: unknown[]) => void) | undefined
    onUserSettingsClick?: ((...args: unknown[]) => void) | undefined
    showEditButton?: boolean | undefined
    clickable?: boolean | undefined
  }
>
type AppAvatarProps = z.infer<typeof AppAvatarSchema>
export declare const AppAvatar: React.FC<AppAvatarProps>
export {}
//# sourceMappingURL=AppAvatar.d.ts.map
