export declare const CleanupUtils: {
    findUnusedImports: (fileContent: string) => string[];
    findAxiosUsage: (fileContent: string) => boolean;
    findOldAuthServiceUsage: (fileContent: string) => boolean;
    findOldZustandUsage: (fileContent: string) => boolean;
    findOldUserSliceUsage: (fileContent: string) => boolean;
    generateCleanupReport: (files: {
        path: string;
        content: string;
    }[]) => {
        unusedImports: {
            file: string;
            imports: string[];
        }[];
        axiosUsage: string[];
        oldAuthServiceUsage: string[];
        oldZustandUsage: string[];
        oldUserSliceUsage: string[];
    };
    validateRTKQueryUsage: (fileContent: string) => {
        hasRTKQuery: boolean;
        hasProperHooks: boolean;
        hasProperErrorHandling: boolean;
    };
    findErrorBoundaries: (fileContent: string) => boolean;
    findLoadingStates: (fileContent: string) => boolean;
    findAccessibilityFeatures: (fileContent: string) => {
        hasAriaLabels: boolean;
        hasRoles: boolean;
        hasAltText: boolean;
    };
};
export declare const CLEANUP_CHECKLIST: readonly ["Remove all axios imports and usage", "Remove old AuthServiceClient references", "Remove old Zustand store usage", "Remove old userSlice references", "Ensure all auth components use RTK Query hooks", "Verify error handling is implemented", "Check for proper loading states", "Validate accessibility features", "Remove unused dependencies from package.json", "Update documentation to reflect RTK Query usage", "Ensure all tests are updated to use RTK Query", "Verify security configurations are in place"];
export declare const getCleanupStatus: () => {
    completed: string[];
    pending: string[];
    total: number;
};
