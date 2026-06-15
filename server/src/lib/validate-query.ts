import { ZodError, type ZodTypeAny, type infer as ZodInfer } from 'zod';
import { ApiError } from './http';

/** Flatten a ZodError into a `{ field: [messages] }` map (matches validateBody). */
export function zodToFieldErrors(err: ZodError): Record<string, string[]> {
  const fields: Record<string, string[]> = {};
  for (const issue of err.issues) {
    const key = issue.path.join('.') || '_';
    (fields[key] ??= []).push(issue.message);
  }
  return fields;
}

/** Parse `req.query` against a schema, throwing ApiError(400) on failure. */
export function parseQuery<S extends ZodTypeAny>(schema: S, query: unknown): ZodInfer<S> {
  const parsed = schema.safeParse(query);
  if (!parsed.success) {
    throw new ApiError(400, 'Invalid query parameters', zodToFieldErrors(parsed.error));
  }
  return parsed.data;
}
