import type { NextFunction, Request, Response } from 'express';
import { getUserById, type UserRow } from '../services/users.service.js';

export type AuthedRequest = Request & { userRow: UserRow };

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) return res.status(401).json({ error: 'Chưa đăng nhập' });
  const user = await getUserById(req.session.userId);
  if (!user) return res.status(401).json({ error: 'Chưa đăng nhập' });
  (req as AuthedRequest).userRow = user;
  next();
}
