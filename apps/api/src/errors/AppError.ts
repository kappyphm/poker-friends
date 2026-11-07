import { ErrorCode, type ErrorDetail, type ErrorResponseBody } from '@poker/shared';
import { ERROR_CATALOG } from './catalog.js';

/**
 * A business/validation error identified purely by its catalog code.
 * Throwing one anywhere in a controller or service is enough: the central
 * error handler turns it into `{ error: { code } }` with the catalog's
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

  toResponseBody(): ErrorResponseBody {
    return {
      error: {
        code: this.code,
        ...(this.details ? { details: this.details } : {}),
      },
    };
  }
}

/** The wire code for any thrown value: AppErrors keep theirs, the rest is S5000. */
export function errorCodeOf(err: unknown): ErrorCode {
  return err instanceof AppError ? err.code : ErrorCode.INTERNAL_ERROR;
}
