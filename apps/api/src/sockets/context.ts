import type { Socket } from 'socket.io';
import type { ErrorCode } from '@poker/shared';
import type { UserRow } from '../services/users.service.js';

/** Per-connection context handed to every socket event handler group. */
export interface SocketHandlerContext {
  socket: Socket;
  user: UserRow;
  userId: string;
  /** Code of the table this socket is currently attached to (mutable). */
  session: { code: string | null };
  /** Emits the standard socket error ack: `{ error: { code } }` — code only. */
  fail: (code: ErrorCode) => void;
}
