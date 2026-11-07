import { ErrorCode, type ErrorDetail, type ErrorResponseBody } from '@poker/shared';
import { ERROR_CATALOG } from './catalog.js';

/** Request-scoped fields the problem body echoes back for traceability. */
export interface ProblemContext {
  /** The request's id — the same value as the `x-request-id` response header. */
  requestId: string;
  /** Path of the request that caused the error (no query string). */
  instance: string;
}

/**
 * Builds the REST error body (RFC 7807 style problem details) for a code:
 * the catalog's fixed English `title`, the HTTP status, the request id, a
 * fresh ISO 8601 timestamp and the request path — plus code-only validation
 * `details` when given. Nothing instance-specific or internal is ever put
 * in the body: no exception text, no stack, no DB errors.
 */
export function problemBody(
  code: ErrorCode,
  ctx: ProblemContext,
  details?: ErrorDetail[],
): ErrorResponseBody {
  const spec = ERROR_CATALOG[code];
  return {
    error: {
      code,
      title: spec.message,
      status: spec.httpStatus,
      requestId: ctx.requestId,
      timestamp: new Date().toISOString(),
      instance: ctx.instance,
      ...(details ? { details } : {}),
    },
  };
}

/**
 * A business/validation error identified purely by its catalog code.
 * Throwing one anywhere in a controller or service is enough: the central
 * error handler turns it into the standard problem body with the catalog's
 * HTTP status. Anything that is NOT an AppError is treated as unexpected
 * and surfaces to clients only as S5000 (INTERNAL_ERROR).
 */
export class AppError extends Error {
  readonly code: ErrorCode;
  readonly details?: ErrorDetail[];

  constructor(code: ErrorCode, details?: ErrorDetail[]) {
    super(ERROR_CATALOG[code].message);
    this.name = 'AppError';
    this.code = code;
    this.details = details;
  }

  get httpStatus(): number {
    return ERROR_CATALOG[this.code].httpStatus;
  }

  toResponseBody(ctx: ProblemContext): ErrorResponseBody {
    return problemBody(this.code, ctx, this.details);
  }
}

/** The wire code for any thrown value: AppErrors keep theirs, the rest is S5000. */
export function errorCodeOf(err: unknown): ErrorCode {
  return err instanceof AppError ? err.code : ErrorCode.INTERNAL_ERROR;
}
