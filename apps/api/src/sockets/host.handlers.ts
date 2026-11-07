import { getLiveTable } from '../services/tables.service.js';
import type { SocketHandlerContext } from './context.js';

export function registerHostHandlers(ctx: SocketHandlerContext) {
  const { socket, userId, session, fail } = ctx;

socket.on('host:start', async () => {
  if (!session.code) return;
  const t = getLiveTable(session.code);
  if (!t) return;
  if (t.cfg.hostId !== userId) return fail('Chỉ chủ bàn mới bắt đầu ván được');
  const chk = t.canStart();
  if (!chk.ok) return fail(chk.reason ?? 'Chưa đủ điều kiện bắt đầu');
  try { t.startHand(); } catch (e) { fail((e as Error).message); }
});
}
