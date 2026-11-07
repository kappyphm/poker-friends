import { Server as SocketServer } from 'socket.io';
import type { Server as HttpServer } from 'node:http';
import type { RequestHandler } from 'express';
import { eq } from 'drizzle-orm';
import { ErrorCode, type SocketErrorBody } from '@poker/shared';
import { CLIENT_URL } from '../config/env.js';
import { db, schema } from '../db/client.js';
import { logger } from '../lib/logger.js';
import { getUserById } from '../services/users.service.js';
import { broadcastState, getLiveTable, setStateBroadcaster } from '../services/tables.service.js';
import { createStateBroadcaster } from './state.js';
import type { SocketHandlerContext } from './context.js';
import { registerTableHandlers } from './table.handlers.js';
import { registerPlayerHandlers } from './player.handlers.js';
import { registerHostHandlers } from './host.handlers.js';

export function attachSockets(httpServer: HttpServer, sessionMiddleware: RequestHandler) {
  const io = new SocketServer(httpServer, { cors: { origin: CLIENT_URL, credentials: true } });
  io.engine.use(sessionMiddleware);
  setStateBroadcaster(createStateBroadcaster(io));

  io.on('connection', async (socket) => {
    const emitError = (code: ErrorCode) => {
      const body: SocketErrorBody = { error: { code } };
      socket.emit('error', body);
    };
    try {
      const sess = (socket.request as unknown as { session?: { userId?: string } }).session;
      const userId = sess?.userId;
      if (!userId) { emitError(ErrorCode.AUTH_REQUIRED); socket.disconnect(); return; }
      const user = await getUserById(userId);
      if (!user) { emitError(ErrorCode.ACCOUNT_NOT_FOUND); socket.disconnect(); return; }
      (socket as unknown as { userId: string }).userId = userId;
      const session = { code: null as string | null };

      const fail = (code: ErrorCode) => emitError(code);

      const ctx: SocketHandlerContext = { socket, user, userId, session, fail };
      registerTableHandlers(ctx);
      registerPlayerHandlers(ctx);
      registerHostHandlers(ctx);

      socket.on('disconnect', async () => {
      if (!session.code) return;
      const t = getLiveTable(session.code);
      if (!t) return;
      const p = t.playerByUser(userId);
      if (p) {
        p.connected = false;
        p.reservedUntil = Date.now() + 5 * 60_000;
        // reserved seat cleanup after 5 minutes
        setTimeout(async () => {
          if (!p.connected && t.playerByUser(userId) === p) {
            const sess = await db.select().from(schema.tableSessions).where(eq(schema.tableSessions.id, p.sessionId));
            if (sess[0] && !sess[0].leftAt) {
              await db.update(schema.tableSessions).set({
                endChips: p.stack, net: p.stack - sess[0].totalBuyIn, leftAt: new Date(),
              }).where(eq(schema.tableSessions.id, p.sessionId));
            }
            t.seats.delete(p.seatIndex);
            broadcastState(t);
          }
          }, 5 * 60_000);
          broadcastState(t);
        }
      });
    } catch (err) {
      logger.error({ err }, 'Socket connection setup failed');
      emitError(ErrorCode.INTERNAL_ERROR);
      socket.disconnect();
    }
  });

  return io;
}
