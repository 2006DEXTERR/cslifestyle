import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { ZodError, type ZodSchema } from 'zod';
import { ApiError } from '../lib/http';

/**
 * Validates `req.body` against a zod schema, replacing it with the parsed
 * (typed, sanitised) value. Responds 400 with field errors on failure.
 */
export function validateBody(schema: ZodSchema): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const fields: Record<string, string[]> = {};
        for (const issue of err.issues) {
          const key = issue.path.join('.') || '_';
          (fields[key] ??= []).push(issue.message);
        }
        return next(new ApiError(400, 'Validation failed', fields));
      }
      next(err);
    }
  };
}
