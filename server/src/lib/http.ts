/**
 * Standard API response envelope (blueprint §8.1):
 *   { status, data, meta, message, errors }
 * Every controller returns through these helpers so responses stay consistent.
 */

export interface Pagination {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}

export interface ApiMeta {
  pagination?: Pagination;
  [key: string]: unknown;
}

export interface SuccessEnvelope<T> {
  status: 'success';
  data: T;
  meta: ApiMeta | null;
  message: string;
  errors: Record<string, unknown>;
}

export interface ErrorEnvelope {
  status: 'error';
  data: null;
  meta: ApiMeta | null;
  message: string;
  errors: Record<string, unknown>;
}

export function ok<T>(data: T, meta: ApiMeta | null = null, message = ''): SuccessEnvelope<T> {
  return { status: 'success', data, meta, message, errors: {} };
}

export function fail(
  message: string,
  errors: Record<string, unknown> = {},
  meta: ApiMeta | null = null,
): ErrorEnvelope {
  return { status: 'error', data: null, meta, message, errors };
}

/** Domain/HTTP error carrying a status code + structured field errors. */
export class ApiError extends Error {
  readonly statusCode: number;
  readonly errors: Record<string, unknown>;

  constructor(statusCode: number, message: string, errors: Record<string, unknown> = {}) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.errors = errors;
    Error.captureStackTrace?.(this, ApiError);
  }

  static notFound(message = 'Resource not found'): ApiError {
    return new ApiError(404, message);
  }

  static badRequest(message = 'Bad request', errors: Record<string, unknown> = {}): ApiError {
    return new ApiError(400, message, errors);
  }

  static unauthorized(message = 'Unauthorized'): ApiError {
    return new ApiError(401, message);
  }

  static forbidden(message = 'Forbidden'): ApiError {
    return new ApiError(403, message);
  }
}
