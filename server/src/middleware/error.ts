import type { Request, Response, NextFunction } from 'express';
import { ApiError, fail } from '../lib/http';
import { isProd } from '../config/env';

/** 404 handler — reached when no route matched. Forwards to the error handler. */
export function notFound(req: Request, _res: Response, next: NextFunction): void {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
}

/**
 * Central error handler — converts any thrown error into the standard error
 * envelope. Must be registered LAST and keep its 4-arg signature so Express
 * recognises it as an error handler.
 */
export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const isApiError = err instanceof ApiError;
  const statusCode = isApiError ? err.statusCode : 500;
  const message = isApiError ? err.message : 'Internal server error';
  const errors = isApiError ? err.errors : {};

  // Log 5xx as errors, 4xx as warnings.
  const log = req.log ?? console;
  if (statusCode >= 500) {
    log.error({ err }, 'Unhandled error');
  } else {
    log.warn({ err: { message, statusCode } }, 'Request error');
  }

  const body = fail(message, errors);
  if (!isProd && err instanceof Error && err.stack) {
    (body.errors as Record<string, unknown>).stack = err.stack;
  }

  res.status(statusCode).json(body);
}
