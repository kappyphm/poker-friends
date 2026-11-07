import { and, eq, isNull } from 'drizzle-orm';
import { db, schema } from '../db/client.js';
import type { SeatPlayer } from '../services/game/types.js';
import { broadcastState, getTableRow, loadOrCreateTableState } from '../services/tables.service.js';
import type { SocketHandlerContext } from './context.js';

export function registerTableHandlers(ctx: SocketHandlerContext) {
  const { socket, user, userId, session, fail } = ctx;

socket.on('table:join', async (payload: { code: string; mode?: string; buyIn?: number }) => {
  try {
    const row = await getTableRow(String(payload?.code ?? ''));
    if (!row) return fail('Không tìm thấy bàn');
    const t = await loadOrCreateTableState(row);
    session.code = t.cfg.code;
    await socket.join(`table:${t.cfg.code}`);

    const existing = t.playerByUser(userId);
    if (payload.mode === 'spectator' && !existing) {
      t.spectators.add(userId);
      broadcastState(t);
      return;
    }
    if (existing) {
      existing.connected = true;
      existing.reservedUntil = null;
      if (existing.sittingOut && !t.handInProgress) existing.sittingOut = false;
      t.spectators.delete(userId);
      broadcastState(t);
      return;
    }
    // new seat requires buy-in
    const buyIn = Number(payload.buyIn ?? 0);
    if (!buyIn || buyIn < row.minBuyIn) return fail(`Buy-in tối thiểu là ${row.minBuyIn} chip`);
    const usedSeats = new Set([...t.seats.values()].map((p) => p.seatIndex));
    let seatIndex = -1;
    for (let i = 0; i < row.seats; i++) if (!usedSeats.has(i)) { seatIndex = i; break; }
    if (seatIndex === -1) return fail('Bàn đã đầy');
    // Reserve the seat SYNCHRONOUSLY before any await, otherwise concurrent
    // joins compute the same free seat and overwrite each other.
    const seat: SeatPlayer = {
      userId, name: user.name, avatarUrl: user.avatarUrl,
      seatIndex, stack: buyIn, sessionId: '',
      connected: true, reservedUntil: null, sittingOut: false,
      inHand: false, holeCards: [], folded: false, allIn: false,
      betStreet: 0, totalContributed: 0, acted: false, showCards: false, lastAction: null,
    };
    t.seats.set(seatIndex, seat);
    t.spectators.delete(userId);
    // open a new session row if none active for this table
    const activeSess = await db.select().from(schema.tableSessions).where(and(
      eq(schema.tableSessions.tableId, row.id),
      eq(schema.tableSessions.userId, userId),
      isNull(schema.tableSessions.leftAt),
    ));
    let sessionRow = activeSess[0];
    if (!sessionRow) {
      const ins = await db.insert(schema.tableSessions).values({
        tableId: row.id, userId, totalBuyIn: buyIn, rebuyCount: 0,
      }).returning();
      sessionRow = ins[0];
    } else {
      await db.update(schema.tableSessions).set({
        totalBuyIn: sessionRow.totalBuyIn + buyIn,
        rebuyCount: sessionRow.rebuyCount + 1,
      }).where(eq(schema.tableSessions.id, sessionRow.id));
      sessionRow = { ...sessionRow, totalBuyIn: sessionRow.totalBuyIn + buyIn, rebuyCount: sessionRow.rebuyCount + 1 };
    }
    seat.sessionId = sessionRow.id;
    broadcastState(t);
  } catch (e) { console.error(e); fail('Có lỗi khi vào bàn'); }
});

socket.on('table:spectate', async (payload: { code: string }) => {
  socket.emit('table:join-hint', { ok: true });
  // handled via table:join with mode spectator from client; kept for clarity
  void payload;
});
}
