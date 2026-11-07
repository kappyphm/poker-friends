import { ErrorCode } from '@poker/shared';
import { ApiError } from './api';

/**
 * Frontend error catalog: error code → Vietnamese user message + how the
 * UI should handle it. This is the ONLY place server errors become text;
 * the raw backend payload is never rendered. Unknown codes fall back to a
 * generic message chosen by HTTP status group.
 */
export type ErrorHandling = 'redirect-login' | 'silent' | 'toast';

interface ErrorPresentation {
  message: string;
  handling: ErrorHandling;
}

const CATALOG: Partial<Record<string, ErrorPresentation>> = {
  // A1xxx — auth & session
  [ErrorCode.AUTH_REQUIRED]: { message: 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại', handling: 'redirect-login' },
  [ErrorCode.ACCOUNT_NOT_FOUND]: { message: 'Tài khoản không còn tồn tại, vui lòng đăng nhập lại', handling: 'redirect-login' },
  [ErrorCode.DEV_LOGIN_DISABLED]: { message: 'Đăng nhập thử nghiệm đang tắt', handling: 'toast' },

  // T2xxx — tables & lobby
  [ErrorCode.TABLE_NOT_FOUND]: { message: 'Không tìm thấy bàn', handling: 'toast' },
  [ErrorCode.TABLE_FULL]: { message: 'Bàn đã đầy, hãy quay lại phòng chờ và chọn bàn khác', handling: 'toast' },
  [ErrorCode.INVALID_INVITE_CODE]: { message: 'Mã mời không đúng hoặc bàn không còn tồn tại', handling: 'toast' },
  [ErrorCode.NOT_HOST]: { message: 'Chỉ chủ bàn mới bắt đầu ván được', handling: 'toast' },
  [ErrorCode.NOT_ENOUGH_PLAYERS]: { message: 'Cần tối thiểu 3 người có chip và không vắng mặt để bắt đầu ván', handling: 'toast' },
  [ErrorCode.GAME_ALREADY_STARTED]: { message: 'Ván đang diễn ra', handling: 'toast' },
  [ErrorCode.NOT_SEATED]: { message: 'Bạn chưa ngồi vào bàn', handling: 'toast' },
  [ErrorCode.BUY_IN_TOO_LOW]: { message: 'Buy-in chưa đạt mức tối thiểu của bàn', handling: 'toast' },
  [ErrorCode.PLAY_SESSION_NOT_FOUND]: { message: 'Không tìm thấy buổi chơi', handling: 'toast' },
  [ErrorCode.REBUY_NOT_ALLOWED]: { message: 'Chỉ mua thêm chip giữa hai ván hoặc khi hết chip', handling: 'toast' },

  // G3xxx — in-game actions
  [ErrorCode.NOT_YOUR_TURN]: { message: 'Chưa tới lượt của bạn', handling: 'silent' },
  [ErrorCode.INVALID_ACTION]: { message: 'Hành động không hợp lệ lúc này', handling: 'toast' },
  [ErrorCode.CHECK_NOT_ALLOWED]: { message: 'Không thể check khi đang có cược cần theo', handling: 'toast' },
  [ErrorCode.CALL_NOT_AVAILABLE]: { message: 'Không có cược để call, hãy check', handling: 'toast' },
  [ErrorCode.RAISE_EXCEEDS_STACK]: { message: 'Số chip raise vượt quá stack của bạn', handling: 'toast' },
  [ErrorCode.RAISE_BELOW_MINIMUM]: { message: 'Raise chưa đạt mức tối thiểu', handling: 'toast' },
  [ErrorCode.RAISE_NOT_ABOVE_CURRENT_BET]: { message: 'Raise phải lớn hơn mức cược hiện tại', handling: 'toast' },
  [ErrorCode.INVALID_AMOUNT]: { message: 'Số chip không hợp lệ', handling: 'toast' },

  // V4xxx — validation
  [ErrorCode.VALIDATION_ERROR]: { message: 'Dữ liệu gửi lên không hợp lệ', handling: 'toast' },

  // S5xxx — server
  [ErrorCode.INTERNAL_ERROR]: { message: 'Đã có lỗi xảy ra, thử lại sau', handling: 'toast' },
};

/** Generic fallbacks for unknown codes, grouped by HTTP status. */
const STATUS_FALLBACKS: Record<number, string> = {
  400: 'Yêu cầu không hợp lệ',
  401: 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại',
  403: 'Bạn không có quyền thực hiện thao tác này',
  404: 'Không tìm thấy dữ liệu',
  409: 'Thao tác không phù hợp với trạng thái hiện tại',
  500: 'Đã có lỗi xảy ra, thử lại sau',
};

const GENERIC_MESSAGE = 'Đã có lỗi xảy ra, thử lại sau';

export interface ResolvedError {
  /** Vietnamese message to show, or null when the error must stay silent. */
  message: string | null;
  handling: ErrorHandling;
}

export function resolveError(err: unknown): ResolvedError {
  if (err instanceof ApiError) {
    const hit = err.code ? CATALOG[err.code] : undefined;
    if (hit) {
      return { message: hit.handling === 'silent' ? null : hit.message, handling: hit.handling };
    }
    // Unknown code: fall back by HTTP status group, never show raw payloads.
    const fallback = STATUS_FALLBACKS[err.status] ?? GENERIC_MESSAGE;
    return {
      message: fallback,
      handling: err.status === 401 ? 'redirect-login' : 'toast',
    };
  }
  return { message: GENERIC_MESSAGE, handling: 'toast' };
}

/** Vietnamese message for a bare code (e.g. the canStart hint), or null. */
export function errorMessageForCode(code: string | null | undefined): string | null {
  if (!code) return null;
  return CATALOG[code]?.message ?? null;
}

/**
 * The single error-display path for the whole web app: resolve the error
 * through the catalog, then apply its per-code handling — redirect to the
 * login page, stay silent, or hand the message to the caller's error state.
 */
export function presentError(err: unknown, show: (message: string) => void): void {
  const { message, handling } = resolveError(err);
  if (handling === 'redirect-login') {
    if (window.location.pathname !== '/') window.location.assign('/');
    return;
  }
  if (handling === 'silent' || !message) return;
  show(message);
}
