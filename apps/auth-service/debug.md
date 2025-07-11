# Debugging TypeScript Express Applications

## Common TypeScript Errors and Solutions

### Type Mismatch in Controller Functions

Error: 
```
TS2769: No overload matches this call.
Argument of type (req: Request, res: Response, next: NextFunction) => Promise<...> 
is not assignable to parameter of type Application<...>
```

Solution:
- Make sure your controller functions are properly typed
- Use correct Express types: `import { Request, Response, NextFunction } from 'express'`
- Add proper error handling with type assertions: `catch (error: any)`

### Module Resolution Issues

Error:
```
Cannot find module '../controllers/auth.controller.js' or its corresponding type declarations
```

Solution:
- Remove file extensions from imports (TypeScript will resolve them)
- Update tsconfig.json with proper module resolution settings
- Make sure the file exists and is properly exported

### Type Definitions for Request Extensions

When adding custom properties to Express.Request (like userId):

1. Create a types folder with proper declaration files
2. Declare the namespace and interface extensions
3. Make sure the types folder is included in your tsconfig.json

## Debugging Steps

1. Check the TypeScript error message carefully
2. Look at the line number and context
3. Verify your import statements
4. Make sure your function signatures match expected types
5. Check for missing type declarations

## Useful Commands

- `npm run typecheck` - Check types without compiling
- `tsc --noEmit` - Verify types without generating output
- `tsc --traceResolution` - See how TypeScript resolves modules
