import type { Request, Response } from 'express';
import { eq, desc } from 'drizzle-orm';
import { ErrorCode } from '@poker/shared';
import { db, schema } from '../db/client.js';
import { AppError } from '../errors/AppError.js';
import { getUserById } from '../services/users.service.js';
import { genCode, getTableRow, loadOrCreateTableState } from '../services/tables.service.js';
import type { AuthedRequest } from '../middleware/requireAuth.js';

export async function createTable(req: Request, res: Response) {
  const user = (req as AuthedRequest).userRow;
  const name = String(req.body?.name ?? 'Friends table').trim() || 'Friends table';
  const seats = Math.min(10, Math.max(3, Number(req.body?.seats ?? 9)));
  const minBuyIn = Math.max(1, Number(req.body?.minBuyIn ?? 200));
  const smallBlind = Math.max(1, Number(req.body?.smallBlind ?? 5));
  const bigBlind = Math.max(smallBlind, Number(req.body?.bigBlind ?? 10));
  let code = genCode();
  while (await getTableRow(code)) code = genCode();
  const inserted = await db.insert(schema.tables).values({
    code, name, hostId: user.id, seats, minBuyIn, smallBlind, bigBlind,
  }).returning();
  await loadOrCreateTableState(inserted[0]);
  res.json({ table: inserted[0] });
}

export async function getTableByCode(req: Request, res: Response) {
  const row = await getTableRow(String(req.params.code));
  if (!row) throw new AppError(ErrorCode.TABLE_NOT_FOUND);
  const host = await getUserById(row.hostId);
  res.json({ table: { ...row, hostName: host?.name ?? '' } });
}

export async function getMyTables(req: Request, res: Response) {
  const user = (req as AuthedRequest).userRow;
  const hosted = await db.select().from(schema.tables).where(eq(schema.tables.hostId, user.id));
  const mySessions = await db.select().from(schema.tableSessions)
    .where(eq(schema.tableSessions.userId, user.id))
    .orderBy(desc(schema.tableSessions.joinedAt)).limit(20);
  const joinedIds = [...new Set(mySessions.map((s) => s.tableId))];
  const joined: typeof hosted = [];
  for (const id of joinedIds) {
    const rows = await db.select().from(schema.tables).where(eq(schema.tables.id, id));
    if (rows[0] && !hosted.find((h) => h.id === id)) joined.push(rows[0]);
  }
  res.json({ hosted, joined });
}
