import { z } from 'zod';

/**
 * Admin access-management + settings validation (Phase 13).
 * Backs the Users, Roles, Settings and SEO admin screens. Mirrors the
 * existing query/body conventions (page/perPage caps, trimmed strings).
 */

// ───────────────────────── Users ─────────────────────────

export const userListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(24),
  q: z.string().trim().max(200).optional(),
  role: z.string().trim().max(60).optional(),
  status: z.enum(['active', 'inactive', 'all']).default('all'),
});
export type UserListQuery = z.infer<typeof userListQuerySchema>;

export const updateUserSchema = z
  .object({
    name: z.string().trim().min(2, 'Name must be at least 2 characters').max(160),
    email: z.string().trim().email('Invalid email').max(254),
    roleId: z.string().trim().min(1).max(60),
  })
  .partial()
  .refine((b) => Object.keys(b).length > 0, { message: 'No fields to update' });
export type UpdateUserBody = z.infer<typeof updateUserSchema>;

export const updateUserStatusSchema = z.object({
  isActive: z.boolean(),
});
export type UpdateUserStatusBody = z.infer<typeof updateUserStatusSchema>;

// ───────────────────────── Roles ─────────────────────────

export const updateRoleSchema = z
  .object({
    description: z.string().trim().max(300),
  })
  .partial()
  .refine((b) => Object.keys(b).length > 0, { message: 'No fields to update' });
export type UpdateRoleBody = z.infer<typeof updateRoleSchema>;

// ───────────────────────── Settings ─────────────────────────

/** A flat `{ key: value }` map; values coerced to strings on persist. */
export const updateSettingsSchema = z.object({
  values: z.record(z.string().trim().max(120), z.union([z.string(), z.number(), z.boolean(), z.null()])),
});
export type UpdateSettingsBody = z.infer<typeof updateSettingsSchema>;
