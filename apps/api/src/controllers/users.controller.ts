import type { Request, Response } from 'express';
import { and, desc, eq, gte, lte } from 'drizzle-orm';
import { ErrorCode } from '@poker/shared';
import { db, schema } from '../db/client.js';
import { AppError } from '../errors/AppError.js';
import type { AuthedRequest } from '../middleware/requireAuth.js';

export async function getMyStats(req: Request, res: Response) {
  const user = (req as AuthedRequest).userRow;
  const sessions = await db.select().from(schema.tableSessions)
    .where(eq(schema.tableSessions.userId, user.id));
  const totalHands = sessions.reduce((s, x) => s + x.handsPlayed, 0);
  const totalWon = sessions.reduce((s, x) => s + x.handsWon, 0);
  const totalBuyIn = sessions.reduce((s, x) => s + x.totalBuyIn, 0);
  const totalNet = sessions.reduce((s, x) => s + (x.net ?? (x.endChips !== null ? x.endChips - x.totalBuyIn : 0)), 0);
  res.json({
    totalSessions: sessions.length,
    totalHands,
    totalHandsWon: totalWon,
    winRate: totalHands ? Math.round((totalWon / totalHands) * 1000) / 10 : 0,
    totalBuyIn,
    totalNet,
  });
}

export async function getMySessions(req: Request, res: Response) {
  const user = (req as AuthedRequest).userRow;
  const sessions = await db.select().from(schema.tableSessions)
    .where(eq(schema.tableSessions.userId, user.id))
    .orderBy(desc(schema.tableSessions.joinedAt)).limit(50);
  const out = [];
  for (const s of sessions) {
    const t = await db.select().from(schema.tables).where(eq(schema.tables.id, s.tableId));
    out.push({ ...s, tableName: t[0]?.name ?? '', tableCode: t[0]?.code ?? '' });
  }
  res.json({ sessions: out });
}

export async function getSessionDetail(req: Request, res: Response) {
  const user = (req as AuthedRequest).userRow;
  const rows = await db.select().from(schema.tableSessions)
    .where(and(eq(schema.tableSessions.id, String(req.params.id)), eq(schema.tableSessions.userId, user.id)));
  const s = rows[0];
  if (!s) throw new AppError(ErrorCode.PLAY_SESSION_NOT_FOUND);
  const t = await db.select().from(schema.tables).where(eq(schema.tables.id, s.tableId));
  const handRows = await db.select().from(schema.hands).where(and(
    eq(schema.hands.tableId, s.tableId),
    gte(schema.hands.createdAt, s.joinedAt),
    ...(s.leftAt ? [lte(schema.hands.createdAt, s.leftAt)] : []),
  )).orderBy(desc(schema.hands.handNumber));
  // Only expose the requester's own hole cards + cards that were shown at showdown
  const safeHands = handRows.map((h) => {
    const hole = (h.holeCards ?? {}) as Record<string, string[]>;
    const shown = (h.showdownInfo ?? {}) as Record<string, string>;
    const visibleHole: Record<string, string[]> = {};
    for (const [uid, cards] of Object.entries(hole)) {
      if (uid === user.id || shown[uid]) visibleHole[uid] = cards;
    }
    return { ...h, holeCards: visibleHole, myCards: hole[user.id] ?? [] };
  });
  res.json({ session: { ...s, tableName: t[0]?.name ?? '', tableCode: t[0]?.code ?? '' }, hands: safeHands });
}
