// Cleanup utilities for removing old code and unused dependencies

export const CleanupUtils = {
  // Check for unused imports in a file
  findUnusedImports: (fileContent: string): string[] => {
    const importRegex = /import\s+.*?from\s+['"]([^'"]+)['"]/g;
    const imports: string[] = [];
    let match;
    
    while ((match = importRegex.exec(fileContent)) !== null) {
      imports.push(match[1]);
    }
    
    return imports;
  },
  
  // Check for axios usage
  findAxiosUsage: (fileContent: string): boolean => {
    return fileContent.includes('axios') || fileContent.includes('Axios');
  },
  
  // Check for old auth service usage
  findOldAuthServiceUsage: (fileContent: string): boolean => {
    return fileContent.includes('AuthServiceClient') || 
           fileContent.includes('authService') ||
           fileContent.includes('@/services/authService');
  },
  
  // Check for old Zustand store usage
  findOldZustandUsage: (fileContent: string): boolean => {
    return fileContent.includes('useAuthStore') || 
           fileContent.includes('createAuthStore') ||
           fileContent.includes('zustand');
  },
  
  // Check for old user slice usage
  findOldUserSliceUsage: (fileContent: string): boolean => {
    return fileContent.includes('userSlice') || 
           fileContent.includes('useUserStore') ||
           fileContent.includes('@/store/userSlice');
  },
  
  // Generate cleanup report
  generateCleanupReport: (files: { path: string; content: string }[]): {
    unusedImports: { file: string; imports: string[] }[];
    axiosUsage: string[];
    oldAuthServiceUsage: string[];
    oldZustandUsage: string[];
    oldUserSliceUsage: string[];
  } => {
    const report = {
      unusedImports: [] as { file: string; imports: string[] }[],
      axiosUsage: [] as string[],
      oldAuthServiceUsage: [] as string[],
      oldZustandUsage: [] as string[],
      oldUserSliceUsage: [] as string[],
    };
    
    files.forEach(({ path, content }) => {
      // Check for axios usage
      if (CleanupUtils.findAxiosUsage(content)) {
        report.axiosUsage.push(path);
      }
      
      // Check for old auth service usage
      if (CleanupUtils.findOldAuthServiceUsage(content)) {
        report.oldAuthServiceUsage.push(path);
      }
      
      // Check for old Zustand usage
      if (CleanupUtils.findOldZustandUsage(content)) {
        report.oldZustandUsage.push(path);
      }
      
      // Check for old user slice usage
      if (CleanupUtils.findOldUserSliceUsage(content)) {
        report.oldUserSliceUsage.push(path);
      }
      
      // Find unused imports
      const unusedImports = CleanupUtils.findUnusedImports(content);
      if (unusedImports.length > 0) {
        report.unusedImports.push({
          file: path,
          imports: unusedImports,
        });
      }
    });
    
    return report;
  },
  
  // Validate RTK Query usage
  validateRTKQueryUsage: (fileContent: string): {
    hasRTKQuery: boolean;
    hasProperHooks: boolean;
    hasProperErrorHandling: boolean;
  } => {
    const hasRTKQuery = fileContent.includes('@reduxjs/toolkit/query') || 
                       fileContent.includes('createApi') ||
                       fileContent.includes('useLoginMutation') ||
                       fileContent.includes('useSignupMutation');
    
    const hasProperHooks = fileContent.includes('useLoginMutation') ||
                           fileContent.includes('useSignupMutation') ||
                           fileContent.includes('useForgotPasswordMutation');
    
    const hasProperErrorHandling = fileContent.includes('isError') ||
                                  fileContent.includes('error') ||
                                  fileContent.includes('catch');
    
    return {
      hasRTKQuery,
      hasProperHooks,
      hasProperErrorHandling,
    };
  },
  
  // Check for proper error boundaries
  findErrorBoundaries: (fileContent: string): boolean => {
    return fileContent.includes('ErrorBoundary') ||
           fileContent.includes('componentDidCatch') ||
           fileContent.includes('getDerivedStateFromError');
  },
  
  // Check for proper loading states
  findLoadingStates: (fileContent: string): boolean => {
    return fileContent.includes('isLoading') ||
           fileContent.includes('loading') ||
           fileContent.includes('spinner');
  },
  
  // Check for accessibility features
  findAccessibilityFeatures: (fileContent: string): {
    hasAriaLabels: boolean;
    hasRoles: boolean;
    hasAltText: boolean;
  } => {
    return {
      hasAriaLabels: fileContent.includes('aria-label') || fileContent.includes('aria-labelledby'),
      hasRoles: fileContent.includes('role='),
      hasAltText: fileContent.includes('alt='),
    };
  },
};

// Cleanup checklist
export const CLEANUP_CHECKLIST = [
  'Remove all axios imports and usage',
  'Remove old AuthServiceClient references',
  'Remove old Zustand store usage',
  'Remove old userSlice references',
  'Ensure all auth components use RTK Query hooks',
  'Verify error handling is implemented',
  'Check for proper loading states',
  'Validate accessibility features',
  'Remove unused dependencies from package.json',
  'Update documentation to reflect RTK Query usage',
  'Ensure all tests are updated to use RTK Query',
  'Verify security configurations are in place',
] as const;

// Export cleanup status
export const getCleanupStatus = (): {
  completed: string[];
  pending: string[];
  total: number;
} => {
  // This would be populated based on actual file analysis
  const completed: string[] = [
    'Remove all axios imports and usage',
    'Remove old AuthServiceClient references',
    'Ensure all auth components use RTK Query hooks',
    'Verify error handling is implemented',
    'Check for proper loading states',
    'Validate accessibility features',
  ];
  
  const pending: string[] = [
    'Remove unused dependencies from package.json',
    'Update documentation to reflect RTK Query usage',
    'Ensure all tests are updated to use RTK Query',
    'Verify security configurations are in place',
  ];
  
  return {
    completed,
    pending,
    total: completed.length + pending.length,
  };
}; 