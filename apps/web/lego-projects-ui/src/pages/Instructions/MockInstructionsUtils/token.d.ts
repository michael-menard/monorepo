export declare function getToken(): string | null;
export declare function setToken(token: string): void;
export declare function removeToken(): void;
export declare function isTokenExpired(token: string): boolean;
export declare function refreshToken(): Promise<string | null>;
