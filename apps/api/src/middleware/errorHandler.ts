import type { NextFunction, Request, Response } from 'express';
import { ErrorCode, type ErrorResponseBody } from '@poker/shared';
import { AppError } from '../errors/AppError.js';
import { ERROR_CATALOG } from '../errors/catalog.js';
import { logger } from '../lib/logger.js';

/**
 * Central error boundary for the REST API.
 *
 * - AppError (business/validation) → its catalog status + `{ error: { code } }`.
 * - Malformed JSON bodies → V4001 VALIDATION_ERROR.
 * - Anything else is unexpected: the full error is logged server-side with
 *   the requestId, and the client only ever sees S5000 INTERNAL_ERROR —
 *   no messages, stack traces or internals cross the wire.
 */
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (res.headersSent) return;

  if (err instanceof AppError) {
    if (err.code === ErrorCode.INTERNAL_ERROR) {
      logger.error({ err, requestId: req.requestId }, 'Internal error');
    }
    res.status(err.httpStatus).json(err.toResponseBody());
    return;
  }

  if (err instanceof SyntaxError && 'body' in err) {
    const body: ErrorResponseBody = { error: { code: ErrorCode.VALIDATION_ERROR } };
    res.status(ERROR_CATALOG[ErrorCode.VALIDATION_ERROR].httpStatus).json(body);
    return;
  }

  logger.error({ err, requestId: req.requestId }, 'Unexpected error');
  const body: ErrorResponseBody = { error: { code: ErrorCode.INTERNAL_ERROR } };
  res.status(ERROR_CATALOG[ErrorCode.INTERNAL_ERROR].httpStatus).json(body);
}
