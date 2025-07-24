/**
 * Enhanced auth hook that provides auth state and actions
 */
export declare function useAuth(): {
    logout: () => Promise<void>;
    forceLogout: () => Promise<void>;
    updateLastActivity: () => void;
    getLastActivity: () => number;
    user: {
        id: string;
        email: string;
        firstName: string;
        lastName: string;
        username: string;
        createdAt: string;
        updatedAt: string;
        avatar?: string;
        bio?: string;
        location?: string;
        website?: string;
        socialLinks?: {
            instagram?: string;
            youtube?: string;
            flickr?: string;
            rebrickable?: string;
        };
        preferences?: {
            theme: "light" | "dark" | "system";
            emailNotifications: boolean;
            publicProfile: boolean;
            showEmail: boolean;
        };
    } | null;
    token: string | null;
    refreshToken: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    isInitialized: boolean;
    error: string | null;
    lastLoginAttempt: string | null;
    sessionExpiry: string | null;
    rememberMe: boolean;
    showAuthModal: boolean;
    authModalType: "login" | "signup" | "forgot-password" | "reset-password" | null;
    redirectAfterLogin: string | null;
    _persist: import("redux-persist/es/types").PersistState;
};
/**
 * Simple hook to check if user is authenticated
 */
export declare function useIsAuthenticated(): boolean;
/**
 * Simple hook to get current user
 */
export declare function useUser(): {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    username: string;
    createdAt: string;
    updatedAt: string;
    avatar?: string;
    bio?: string;
    location?: string;
    website?: string;
    socialLinks?: {
        instagram?: string;
        youtube?: string;
        flickr?: string;
        rebrickable?: string;
    };
    preferences?: {
        theme: "light" | "dark" | "system";
        emailNotifications: boolean;
        publicProfile: boolean;
        showEmail: boolean;
    };
};
/**
 * Simple hook to check if user is verified
 */
export declare function useIsVerified(): boolean;
/**
 * Simple hook to get auth loading state
 */
export declare function useAuthLoading(): boolean;
/**
 * Simple hook to get auth error
 */
export declare function useAuthError(): string;
