import { randomBytes } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { cardToString } from '@poker/shared';
import { db, schema } from '../db/client.js';
import { logger } from '../lib/logger.js';
import { GameTable } from './game/GameTable.js';

// ---------- live tables in memory ----------

export function getLiveTable(code: string): GameTable | undefined {
  return tablesByCode.get(code);
}

// The sockets layer injects the real broadcaster (it owns the Socket.IO
// server); GameTable state changes and the REST/socket handlers reach it
// through broadcastState below.
let stateBroadcaster: ((t: GameTable) => void) | null = null;

export function setStateBroadcaster(fn: (t: GameTable) => void) {
  stateBroadcaster = fn;
}

export function broadcastState(t: GameTable) {
  stateBroadcaster?.(t);
}

const tablesByCode = new Map<string, GameTable>();
const turnTimers = new Map<string, NodeJS.Timeout>();

export function genCode(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let code = '';
  const bytes = randomBytes(6);
  for (let i = 0; i < 6; i++) code += chars[bytes[i] % chars.length];
  return code;
}

export async function loadOrCreateTableState(row: typeof schema.tables.$inferSelect): Promise<GameTable> {
  let t = tablesByCode.get(row.code);
  if (!t) {
    t = new GameTable({
      id: row.id, code: row.code, name: row.name, hostId: row.hostId,
      seatsCount: row.seats, minBuyIn: row.minBuyIn,
      smallBlind: row.smallBlind, bigBlind: row.bigBlind,
    });
    t.onStateChange = () => broadcastState(t!);
    t.onHandComplete = async (rec) => {
      await db.insert(schema.hands).values({
        tableId: row.id,
        handNumber: rec.handNumber,
        board: rec.board,
        totalPot: rec.totalPot,
        winners: rec.winners,
        actionLog: rec.actionLog,
        holeCards: rec.holeCards,
        showdownInfo: rec.showdownInfo,
      });
      // update session stats for participants
      for (const p of t!.seats.values()) {
        if (!rec.participantIds.includes(p.userId)) continue;
        const sess = await db.select().from(schema.tableSessions)
          .where(eq(schema.tableSessions.id, p.sessionId));
        if (!sess[0]) continue;
        const won = rec.winners.find((w) => w.userId === p.userId);
        await db.update(schema.tableSessions).set({
          handsPlayed: sess[0].handsPlayed + 1,
          handsWon: sess[0].handsWon + (won ? 1 : 0),
          biggestPot: Math.max(sess[0].biggestPot, won?.amount ?? 0),
        }).where(eq(schema.tableSessions.id, p.sessionId));
      }
    };
    tablesByCode.set(row.code, t);
  }
  return t;
}

export async function getTableRow(code: string) {
  const rows = await db.select().from(schema.tables).where(eq(schema.tables.code, code.toUpperCase()));
  return rows[0] ?? null;
}

export function publicState(t: GameTable, viewerId: string) {
  const isSpectator = t.spectators.has(viewerId) && !t.playerByUser(viewerId);
  const turnP = t.turnPlayer();
  return {
    code: t.cfg.code,
    name: t.cfg.name,
    hostId: t.cfg.hostId,
    seatsCount: t.cfg.seatsCount,
    minBuyIn: t.cfg.minBuyIn,
    smallBlind: t.cfg.smallBlind,
    bigBlind: t.cfg.bigBlind,
    handInProgress: t.handInProgress,
    street: t.street,
    board: t.board.map(cardToString),
    pot: [...t.seats.values()].reduce((s, p) => s + p.totalContributed, 0),
    currentBet: t.currentBet,
    minRaiseTo: t.minRaiseTo(),
    turnUserId: turnP?.userId ?? null,
    turnDeadline: t.turnDeadline,
    dealerSeat: t.dealerSeat,
    handNumber: t.handNumber,
    canStart: t.canStart(),
    isSpectator,
    lastResult: t.lastResult ? {
      handNumber: t.lastResult.handNumber,
      totalPot: t.lastResult.totalPot,
      winners: t.lastResult.winners,
      board: t.lastResult.board,
    } : null,
    players: [...t.seats.values()].sort((a, b) => a.seatIndex - b.seatIndex).map((p) => {
      const mine = p.userId === viewerId;
      const shown = p.showCards && t.street === 'showdown';
      return {
        userId: p.userId,
        name: p.name,
        avatarUrl: p.avatarUrl,
        seatIndex: p.seatIndex,
        stack: p.stack,
        connected: p.connected,
        sittingOut: p.sittingOut,
        inHand: p.inHand,
        folded: p.folded,
        allIn: p.allIn,
        bet: p.betStreet,
        totalContributed: p.totalContributed,
        lastAction: p.lastAction,
        isDealer: p.seatIndex === t.dealerSeat && t.handInProgress,
        isTurn: turnP?.userId === p.userId,
        cards: mine ? p.holeCards.map(cardToString) : shown ? p.holeCards.map(cardToString) : null,
        cardsHidden: !mine && !shown && p.inHand && p.holeCards.length > 0,
        handRank: shown && t.lastResult?.showdownInfo?.[p.userId] ? t.lastResult.showdownInfo[p.userId] : null,
      };
    }),
    spectatorCount: t.spectators.size,
  };
}

export function scheduleTurnTimer(t: GameTable) {
  const key = t.cfg.code;
  const existing = turnTimers.get(key);
  if (existing) { clearTimeout(existing); turnTimers.delete(key); }
  if (!t.handInProgress) { t.turnDeadline = null; return; }
  const p = t.turnPlayer();
  if (!p) { t.turnDeadline = null; return; }
  t.turnDeadline = Date.now() + 30_000;
  const timer = setTimeout(() => {
    try {
      if (t.handInProgress && t.turnPlayer()?.userId === p.userId) {
        // disconnected players fold/check immediately at their turn via same path
        t.autoAction(p.userId);
      }
    } catch (e) { logger.error({ err: e }, 'Auto action failed'); }
  }, p.connected ? 30_000 : 1_000);
  turnTimers.set(key, timer);
}
