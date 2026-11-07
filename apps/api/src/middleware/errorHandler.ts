import type { NextFunction, Request, Response } from 'express';
import { ErrorCode } from '@poker/shared';
import { AppError, problemBody, type ProblemContext } from '../errors/AppError.js';
import { ERROR_CATALOG } from '../errors/catalog.js';
import { logger } from '../lib/logger.js';

/**
 * Central error boundary for the REST API. Every error response uses the
 * standard problem body (RFC 7807 style): the stable code, the catalog's
 * fixed English title, the HTTP status, the request id, a timestamp and
 * the request path — plus code-only `details` for validation errors.
 *
 * - AppError (business/validation) → its catalog status + problem body.
 * - Malformed JSON bodies → V4001 VALIDATION_ERROR.
 * - Anything else is unexpected: the full error is logged server-side with
 *   the requestId, and the client only ever sees S5000 INTERNAL_ERROR —
 *   no exception messages, stack traces or internals cross the wire.
 */
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (res.headersSent) return;

  const ctx: ProblemContext = {
    requestId: req.requestId ?? '',
    instance: req.path,
  };

  if (err instanceof AppError) {
    if (err.code === ErrorCode.INTERNAL_ERROR) {
      logger.error({ err, requestId: req.requestId }, 'Internal error');
    }
    res.status(err.httpStatus).json(err.toResponseBody(ctx));
    return;
  }

  if (err instanceof SyntaxError && 'body' in err) {
    const code = ErrorCode.VALIDATION_ERROR;
    res.status(ERROR_CATALOG[code].httpStatus).json(problemBody(code, ctx));
    return;
  }

  logger.error({ err, requestId: req.requestId }, 'Unexpected error');
  const code = ErrorCode.INTERNAL_ERROR;
  res.status(ERROR_CATALOG[code].httpStatus).json(problemBody(code, ctx));
}
