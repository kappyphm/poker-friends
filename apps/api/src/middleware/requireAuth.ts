import type { NextFunction, Request, Response } from 'express';
import { ErrorCode } from '@poker/shared';
import { AppError } from '../errors/AppError.js';
import { getUserById, type UserRow } from '../services/users.service.js';

export type AuthedRequest = Request & { userRow: UserRow };

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    if (!req.session.userId) throw new AppError(ErrorCode.AUTH_REQUIRED);
    const user = await getUserById(req.session.userId);
    if (!user) throw new AppError(ErrorCode.ACCOUNT_NOT_FOUND);
    (req as AuthedRequest).userRow = user;
    next();
  } catch (err) {
    next(err);
  }
}
