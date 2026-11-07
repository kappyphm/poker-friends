import { ErrorCode } from '@poker/shared';

export interface ErrorSpec {
  httpStatus: number;
  /** English, developer-facing message: used in logs and API docs only. */
  message: string;
}

/**
 * Backend error catalog: every code the API may send, with its HTTP status
 * and an English message. The message NEVER goes on the wire — clients only
 * receive the code and render their own localized text for it.
 */
export const ERROR_CATALOG: Record<ErrorCode, ErrorSpec> = {
  // A1xxx — auth & session
  [ErrorCode.AUTH_REQUIRED]: { httpStatus: 401, message: 'Authentication required' },
  [ErrorCode.ACCOUNT_NOT_FOUND]: { httpStatus: 401, message: 'Account for this session no longer exists' },
  [ErrorCode.DEV_LOGIN_DISABLED]: { httpStatus: 403, message: 'Dev login is disabled' },

  // T2xxx — tables & lobby
  [ErrorCode.TABLE_NOT_FOUND]: { httpStatus: 404, message: 'Table not found' },
  [ErrorCode.TABLE_FULL]: { httpStatus: 409, message: 'Table is full' },
  [ErrorCode.INVALID_INVITE_CODE]: { httpStatus: 404, message: 'Invalid invite code' },
  [ErrorCode.NOT_HOST]: { httpStatus: 403, message: 'Only the table host can perform this action' },
  [ErrorCode.NOT_ENOUGH_PLAYERS]: { httpStatus: 409, message: 'At least 3 players with chips and present are required to start' },
  [ErrorCode.GAME_ALREADY_STARTED]: { httpStatus: 409, message: 'A hand is already in progress' },
  [ErrorCode.NOT_SEATED]: { httpStatus: 409, message: 'Player is not seated at this table' },
  [ErrorCode.BUY_IN_TOO_LOW]: { httpStatus: 400, message: 'Buy-in is below the table minimum' },
  [ErrorCode.PLAY_SESSION_NOT_FOUND]: { httpStatus: 404, message: 'Play session not found' },
  [ErrorCode.REBUY_NOT_ALLOWED]: { httpStatus: 409, message: 'Rebuy is only allowed between hands or when out of chips' },

  // G3xxx — in-game actions
  [ErrorCode.NOT_YOUR_TURN]: { httpStatus: 409, message: 'Not your turn' },
  [ErrorCode.INVALID_ACTION]: { httpStatus: 400, message: 'Action is not valid in the current hand state' },
  [ErrorCode.CHECK_NOT_ALLOWED]: { httpStatus: 400, message: 'Cannot check when a call is pending' },
  [ErrorCode.CALL_NOT_AVAILABLE]: { httpStatus: 400, message: 'Nothing to call; check instead' },
  [ErrorCode.RAISE_EXCEEDS_STACK]: { httpStatus: 400, message: 'Raise exceeds the player stack' },
  [ErrorCode.RAISE_BELOW_MINIMUM]: { httpStatus: 400, message: 'Raise is below the minimum raise' },
  [ErrorCode.RAISE_NOT_ABOVE_CURRENT_BET]: { httpStatus: 400, message: 'Raise must be above the current bet' },
  [ErrorCode.INVALID_AMOUNT]: { httpStatus: 400, message: 'Invalid chip amount' },

  // V4xxx — validation
  [ErrorCode.VALIDATION_ERROR]: { httpStatus: 400, message: 'Validation failed' },
  [ErrorCode.NAME_REQUIRED]: { httpStatus: 400, message: 'Name is required' },

  // S5xxx — server
  [ErrorCode.INTERNAL_ERROR]: { httpStatus: 500, message: 'Internal server error' },
};
