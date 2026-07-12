import type { Request, Response } from 'express';
import { ok } from '../../lib/http';
import { parseQuery } from '../../lib/validate-query';
import { userListQuerySchema } from '../../validation/admin.schemas';
import * as svc from '../../services/admin/access.service';

// ── Users ──

export async function listUsers(req: Request, res: Response): Promise<void> {
  const query = parseQuery(userListQuerySchema, req.query);
  const { items, pagination } = await svc.listUsers(query);
  res.json(ok(items, { pagination }));
}

export async function createUser(req: Request, res: Response): Promise<void> {
  const user = await svc.createUser(req.body);
  res.status(201).json(ok(user, null, 'User created'));
}

export async function getUser(req: Request, res: Response): Promise<void> {
  const user = await svc.getUser(req.params.id);
  res.json(ok(user));
}

export async function deleteUser(req: Request, res: Response): Promise<void> {
  const user = await svc.deleteUser(req.params.id, req.user?.id ?? null);
  res.json(ok(user, null, 'User deactivated'));
}

export async function updateUser(req: Request, res: Response): Promise<void> {
  const user = await svc.updateUser(req.params.id, req.body);
  res.json(ok(user, null, 'User updated'));
}

export async function updateUserStatus(req: Request, res: Response): Promise<void> {
  const user = await svc.setUserStatus(req.params.id, req.body.isActive);
  res.json(ok(user, null, 'User status updated'));
}

// ── Roles ──

export async function listRoles(_req: Request, res: Response): Promise<void> {
  const roles = await svc.listRoles();
  res.json(ok(roles));
}

export async function createRole(req: Request, res: Response): Promise<void> {
  const role = await svc.createRole(req.body);
  res.status(201).json(ok(role, null, 'Role created'));
}

export async function getRole(req: Request, res: Response): Promise<void> {
  const role = await svc.getRole(req.params.id);
  res.json(ok(role));
}

export async function updateRole(req: Request, res: Response): Promise<void> {
  const role = await svc.updateRole(req.params.id, req.body);
  res.json(ok(role, null, 'Role updated'));
}
