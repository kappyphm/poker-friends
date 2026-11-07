import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
    }
  }
}

/**
 * Assigns every HTTP request an id (propagating a client-supplied
 * `x-request-id` when present). The id is echoed in the response header and
 * attached to error logs so a reported error code can be traced server-side.
 */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction) {
  const incoming = req.header('x-request-id');
  req.requestId = incoming && incoming.length <= 128 ? incoming : randomUUID();
  res.setHeader('x-request-id', req.requestId);
  next();
}

export function getRequestId(req: Request): string | undefined {
  return req.requestId;
}
