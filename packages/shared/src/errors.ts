/**
 * Error codes — the ONLY error contract between the API and its clients.
 *
 * Clients key everything off the stable `code`: each side keeps its own
 * catalog that maps a code to a message in its own language plus, on the
 * web client, a per-code handling strategy.
 *
 * The body around the code differs by transport:
 * - REST wraps the code in an RFC 7807 style problem-details object
 *   (`ErrorResponseBody`): the catalog's fixed English `title` for the code,
 *   the HTTP status, the request id, a timestamp and the request path.
 *   The title is a constant per code — never instance-specific prose: no
 *   exception text, stack traces or DB errors ever cross the wire.
 * - Socket.IO keeps the compact body (`SocketErrorBody`): the code (and
 *   validation details) only — realtime events have no HTTP status or
 *   request line, so the problem-details fields do not apply.
 *
 * Format: one domain letter + number.
 *   A1xxx auth/session · T2xxx table/lobby · G3xxx in-game actions
 *   V4xxx validation   · S5xxx server
 */
export const ErrorCode = {
  // A1xxx — auth & session
  AUTH_REQUIRED: 'A1001',
  ACCOUNT_NOT_FOUND: 'A1002',
  DEV_LOGIN_DISABLED: 'A1003',

  // T2xxx — tables & lobby
  TABLE_NOT_FOUND: 'T2001',
  TABLE_FULL: 'T2002',
  INVALID_INVITE_CODE: 'T2003',
  NOT_HOST: 'T2004',
  NOT_ENOUGH_PLAYERS: 'T2005',
  GAME_ALREADY_STARTED: 'T2006',
  NOT_SEATED: 'T2007',
  BUY_IN_TOO_LOW: 'T2008',
  PLAY_SESSION_NOT_FOUND: 'T2009',
  REBUY_NOT_ALLOWED: 'T2010',

  // G3xxx — in-game actions
  NOT_YOUR_TURN: 'G3001',
  INVALID_ACTION: 'G3002',
  CHECK_NOT_ALLOWED: 'G3003',
  CALL_NOT_AVAILABLE: 'G3004',
  RAISE_EXCEEDS_STACK: 'G3005',
  RAISE_BELOW_MINIMUM: 'G3006',
  RAISE_NOT_ABOVE_CURRENT_BET: 'G3007',
  INVALID_AMOUNT: 'G3008',

  // V4xxx — validation (V41xx are field-level sub-codes used inside `details`)
  VALIDATION_ERROR: 'V4001',
  NAME_REQUIRED: 'V4101',

  // S5xxx — server
  INTERNAL_ERROR: 'S5000',
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

/** Optional per-field validation detail: still code-only, never free text. */
export interface ErrorDetail {
  field: string;
  code: ErrorCode;
}

/**
 * REST error body: RFC 7807 style problem details keyed by the stable code.
 * `title` is the backend catalog's fixed English summary for the code;
 * `instance` is the path of the request that caused the error (no query
 * string); `requestId` matches the response's `x-request-id` header.
 * `details` is present only for validation errors.
 */
export interface ErrorResponseBody {
  error: {
    code: ErrorCode;
    title: string;
    status: number;
    requestId: string;
    timestamp: string;
    instance: string;
    details?: ErrorDetail[];
  };
}

/**
 * Socket error body: intentionally compact — the code (and validation
 * details, where applicable) only. See the note at the top of this file.
 */
export interface SocketErrorBody {
  error: {
    code: ErrorCode;
    details?: ErrorDetail[];
  };
}
