import React from 'react';
type Theme = 'light' | 'dark' | 'system';
interface ThemeContextType {
    theme: Theme;
    setTheme: (theme: Theme) => void;
    resolvedTheme: 'light' | 'dark';
}
interface ThemeProviderProps {
    children: React.ReactNode;
    defaultTheme?: Theme;
    storageKey?: string;
}
export declare const ThemeProvider: React.FC<ThemeProviderProps>;
export declare const useTheme: () => ThemeContextType;
export {};
//# sourceMappingURL=ThemeProvider.d.ts.map