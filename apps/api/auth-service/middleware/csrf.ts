import { Request, Response, NextFunction } from 'express';

/**
 * CSRF middleware that validates the presence and correctness of CSRF tokens
 * for state-changing requests (POST, PUT, PATCH, DELETE).
 *
 * This middleware:
 * 1. Checks if the request method is a state-changing method
 * 2. For production, validates that the request origin is allowed
 * 3. Verifies that the XSRF-TOKEN cookie matches the X-CSRF-Token header
 * 4. Rejects requests with 403 and appropriate error message if validation fails
 */
export function csrf(req: Request, res: Response, next: NextFunction): void {
  const method = req.method.toUpperCase();

  // Skip CSRF validation for safe methods
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    return next();
  }

  // Origin validation in production
  if (process.env.NODE_ENV === 'production') {
    const allowedOrigins = new Set(
      ['http://localhost:5173', process.env.APP_ORIGIN, process.env.FRONTEND_URL].filter(
        Boolean,
      ) as string[],
    );

    const origin = req.get('origin') || req.get('referer') || '';

    if (
      origin &&
      ![...allowedOrigins].some((allowedOrigin: string) => origin.startsWith(allowedOrigin))
    ) {
      res.status(403).json({
        success: false,
        code: 'CSRF_FAILED',
        message: 'Invalid origin',
      });
      return;
    }
  }

  // CSRF token validation
  const cookieToken = req.cookies['XSRF-TOKEN'];
  const headerToken = req.get('x-csrf-token');

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    res.status(403).json({
      success: false,
      code: 'CSRF_FAILED',
      message: 'CSRF validation failed',
    });
    return;
  }

  // If all validations pass, continue to next middleware
  next();
}
