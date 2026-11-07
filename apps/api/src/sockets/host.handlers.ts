import { ErrorCode } from '@poker/shared';
import { errorCodeOf } from '../errors/AppError.js';
import { logger } from '../lib/logger.js';
import { getLiveTable } from '../services/tables.service.js';
import type { SocketHandlerContext } from './context.js';

export function registerHostHandlers(ctx: SocketHandlerContext) {
  const { socket, userId, session, fail } = ctx;

socket.on('host:start', async () => {
  if (!session.code) return;
  const t = getLiveTable(session.code);
  if (!t) return;
  if (t.cfg.hostId !== userId) return fail(ErrorCode.NOT_HOST);
  const chk = t.canStart();
  if (!chk.ok) return fail(chk.code ?? ErrorCode.NOT_ENOUGH_PLAYERS);
  try {
    t.startHand();
  } catch (e) {
    if (errorCodeOf(e) === ErrorCode.INTERNAL_ERROR) logger.error({ err: e }, 'Failed to start hand');
    fail(errorCodeOf(e));
  }
});
}
