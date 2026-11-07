import { eq } from 'drizzle-orm';
import { ErrorCode } from '@poker/shared';
import { db, schema } from '../db/client.js';
import { errorCodeOf } from '../errors/AppError.js';
import { logger } from '../lib/logger.js';
import { broadcastState, getLiveTable } from '../services/tables.service.js';
import type { SocketHandlerContext } from './context.js';

export function registerPlayerHandlers(ctx: SocketHandlerContext) {
  const { socket, userId, session, fail } = ctx;

socket.on('player:rebuy', async (payload: { amount: number }) => {
  try {
    if (!session.code) return;
    const t = getLiveTable(session.code);
    if (!t) return;
    const p = t.playerByUser(userId);
    if (!p) return fail(ErrorCode.NOT_SEATED);
    if (t.handInProgress && p.inHand && !p.folded) return fail(ErrorCode.REBUY_NOT_ALLOWED);
    if (t.handInProgress && p.inHand && p.stack > 0) return fail(ErrorCode.REBUY_NOT_ALLOWED);
    const amount = Number(payload.amount ?? 0);
    if (!amount || amount <= 0) return fail(ErrorCode.INVALID_AMOUNT);
    p.stack += amount;
    if (p.stack > 0) p.sittingOut = false;
    const sess = await db.select().from(schema.tableSessions).where(eq(schema.tableSessions.id, p.sessionId));
    if (sess[0]) {
      await db.update(schema.tableSessions).set({
        totalBuyIn: sess[0].totalBuyIn + amount,
        rebuyCount: sess[0].rebuyCount + 1,
      }).where(eq(schema.tableSessions.id, p.sessionId));
    }
    broadcastState(t);
  } catch (e) {
    if (errorCodeOf(e) === ErrorCode.INTERNAL_ERROR) logger.error({ err: e }, 'Failed to rebuy');
    fail(errorCodeOf(e));
  }
});

socket.on('player:action', async (payload: { action: string; amount?: number }) => {
  if (!session.code) return;
  const t = getLiveTable(session.code);
  if (!t) return;
  try {
    t.applyAction(userId, payload.action as never, payload.amount);
  } catch (e) {
    if (errorCodeOf(e) === ErrorCode.INTERNAL_ERROR) logger.error({ err: e }, 'Player action failed');
    fail(errorCodeOf(e));
  }
});

socket.on('player:sitout', async (payload: { sittingOut: boolean }) => {
  if (!session.code) return;
  const t = getLiveTable(session.code);
  const p = t?.playerByUser(userId);
  if (p) { p.sittingOut = Boolean(payload.sittingOut); broadcastState(t!); }
});

socket.on('player:leave', async () => {
  if (!session.code) return;
  const t = getLiveTable(session.code);
  if (!t) return;
  const p = t.playerByUser(userId);
  if (p) {
    if (t.handInProgress && p.inHand && !p.folded) {
      // fold immediately if it's not their turn, mark folded
      p.folded = true;
      if (t.turnPlayer()?.userId === userId) {
        try { t.applyAction(userId, 'fold'); } catch { /* ignore */ }
      }
    }
    const endChips = p.stack + (t.handInProgress && p.inHand ? 0 : 0);
    const sess = await db.select().from(schema.tableSessions).where(eq(schema.tableSessions.id, p.sessionId));
    if (sess[0]) {
      await db.update(schema.tableSessions).set({
        endChips, net: endChips - sess[0].totalBuyIn, leftAt: new Date(),
      }).where(eq(schema.tableSessions.id, p.sessionId));
    }
    t.seats.delete(p.seatIndex);
    broadcastState(t);
  }
  t.spectators.delete(userId);
  await socket.leave(`table:${session.code}`);
  session.code = null;
});
}
