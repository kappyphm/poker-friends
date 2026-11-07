import type { ErrorDetail } from '@poker/shared';

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
}

/**
 * An error from the API, identified by its stable error code (see
 * lib/errors.ts for the code → message/handling catalog). The API never
 * sends human-readable prose, so there is deliberately no server message
 * here to display.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string | null;
  readonly details?: ErrorDetail[];

  constructor(status: number, code: string | null, details?: ErrorDetail[]) {
    super(code ?? `HTTP ${status}`);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }

  /** Build from a socket `error` event payload: `{ error: { code } }`. */
  static fromSocketPayload(payload: unknown): ApiError {
    const code = (payload as { error?: { code?: unknown } } | null)?.error?.code;
    const details = (payload as { error?: { details?: ErrorDetail[] } } | null)?.error?.details;
    return new ApiError(0, typeof code === 'string' ? code : null, details);
  }
}

export async function api<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const errBody = (data as { error?: { code?: unknown; details?: ErrorDetail[] } }).error;
    throw new ApiError(
      res.status,
      typeof errBody?.code === 'string' ? errBody.code : null,
      errBody?.details,
    );
  }
  return data as T;
}
