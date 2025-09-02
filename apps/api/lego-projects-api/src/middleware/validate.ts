import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

type SchemaShape = {
  body?: z.ZodTypeAny;
  query?: z.ZodTypeAny;
  params?: z.ZodTypeAny;
};

export function validate(shape: SchemaShape) {
  const schema = z.object({
    body: shape.body ?? z.any(),
    query: shape.query ?? z.any(),
    params: shape.params ?? z.any(),
  });

  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse({
      body: req.body,
      query: req.query,
      params: req.params,
    });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        errors: result.error.flatten(),
      });
    }
    return next();
  };
}
