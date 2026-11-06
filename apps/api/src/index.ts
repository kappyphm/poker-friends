import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import session from 'express-session';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { createServer } from 'node:http';
import { Server as SocketServer } from 'socket.io';
import { eq, and, desc, gte, lte, isNull } from 'drizzle-orm';
import { randomBytes } from 'node:crypto';
import { db, schema } from './db.js';
import { GameTable, type SeatPlayer } from './game.js';
import { cardToString } from '@poker/shared';

const PORT = Number(process.env.PORT ?? 4000);
const CLIENT_URL = process.env.CLIENT_URL ?? 'http://localhost:5173';
const DEV_AUTH = process.env.DEV_AUTH === 'true';

const app = express();
const httpServer = createServer(app);

const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET ?? 'dev-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax', maxAge: 1000 * 60 * 60 * 24 * 7 },
});

app.use(cors({ origin: CLIENT_URL, credentials: true }));
app.use(express.json());
app.use(sessionMiddleware);
app.use(passport.initialize());

declare module 'express-session' {
  interface SessionData { userId?: string }
}

// ---------- users / auth ----------
async function getUserById(id: string) {
  const rows = await db.select().from(schema.users).where(eq(schema.users.id, id));
  return rows[0] ?? null;
}

async function findOrCreateUser(opts: { googleId?: string; email: string; name: string; avatarUrl?: string | null }) {
  if (opts.googleId) {
    const existing = await db.select().from(schema.users).where(eq(schema.users.googleId, opts.googleId));
    if (existing[0]) return existing[0];
  }
  const byEmail = await db.select().from(schema.users).where(eq(schema.users.email, opts.email));
  if (byEmail[0]) return byEmail[0];
  const inserted = await db.insert(schema.users).values({
    googleId: opts.googleId ?? null,
    email: opts.email,
    name: opts.name,
    avatarUrl: opts.avatarUrl ?? null,
  }).returning();
  return inserted[0];
}

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: `http://localhost:${PORT}/auth/google/callback`,
    },
    async (_at, _rt, profile, done) => {
      try {
        const user = await findOrCreateUser({
          googleId: profile.id,
          email: profile.emails?.[0]?.value ?? `${profile.id}@google.local`,
          name: profile.displayName,
          avatarUrl: profile.photos?.[0]?.value ?? null,
        });
        done(null, user as Express.User);
      } catch (e) { done(e as Error); }
    },
  ));
  passport.serializeUser((user: Express.User, done) => done(null, (user as unknown as { id: string }).id));
  passport.deserializeUser(async (id: string, done) => {
    try { done(null, (await getUserById(id)) as Express.User); } catch (e) { done(e as Error); }
  });

  app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
  app.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: `${CLIENT_URL}/?login=failed` }),
    (req, res) => {
      const user = req.user as { id: string } | undefined;
      if (user) req.session.userId = user.id;
      res.redirect(`${CLIENT_URL}/phong-cho`);
    });
}

app.get('/api/auth/config', (_req, res) => {
  res.json({ devAuth: DEV_AUTH, googleConfigured: Boolean(process.env.GOOGLE_CLIENT_ID) });
});

app.post('/api/auth/dev-login', async (req, res) => {
  if (!DEV_AUTH) return res.status(403).json({ error: 'Dev login đang tắt' });
  const name = String(req.body?.name ?? '').trim();
  if (!name) return res.status(400).json({ error: 'Thiếu tên' });
  const slug = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-');
  const user = await findOrCreateUser({ email: `dev-${slug}@poker.local`, name });
  req.session.userId = user.id;
  res.json({ user });
});

app.get('/api/auth/me', async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Chưa đăng nhập' });
  const user = await getUserById(req.session.userId);
  if (!user) return res.status(401).json({ error: 'Chưa đăng nhập' });
  res.json({ user });
});

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

async function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (!req.session.userId) return res.status(401).json({ error: 'Chưa đăng nhập' });
  const user = await getUserById(req.session.userId);
  if (!user) return res.status(401).json({ error: 'Chưa đăng nhập' });
  (req as express.Request & { userRow: typeof user }).userRow = user;
  next();
}
type AuthedReq = express.Request & { userRow: NonNullable<Awaited<ReturnType<typeof getUserById>>> };

// ---------- tables in memory ----------
const tablesByCode = new Map<string, GameTable>();
const turnTimers = new Map<string, NodeJS.Timeout>();

function genCode(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let code = '';
  const bytes = randomBytes(6);
  for (let i = 0; i < 6; i++) code += chars[bytes[i] % chars.length];
  return code;
}

async function loadOrCreateTableState(row: typeof schema.tables.$inferSelect): Promise<GameTable> {
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

async function getTableRow(code: string) {
  const rows = await db.select().from(schema.tables).where(eq(schema.tables.code, code.toUpperCase()));
  return rows[0] ?? null;
}

// ---------- REST: tables ----------
app.post('/api/tables', requireAuth, async (req, res) => {
  const user = (req as AuthedReq).userRow;
  const name = String(req.body?.name ?? 'Bàn của bạn bè').trim() || 'Bàn của bạn bè';
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
});

app.get('/api/tables/code/:code', requireAuth, async (req, res) => {
  const row = await getTableRow(String(req.params.code));
  if (!row) return res.status(404).json({ error: 'Không tìm thấy bàn' });
  const host = await getUserById(row.hostId);
  res.json({ table: { ...row, hostName: host?.name ?? '' } });
});

app.get('/api/tables/mine', requireAuth, async (req, res) => {
  const user = (req as AuthedReq).userRow;
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
});

// ---------- REST: history / stats ----------
app.get('/api/me/stats', requireAuth, async (req, res) => {
  const user = (req as AuthedReq).userRow;
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
});

app.get('/api/me/sessions', requireAuth, async (req, res) => {
  const user = (req as AuthedReq).userRow;
  const sessions = await db.select().from(schema.tableSessions)
    .where(eq(schema.tableSessions.userId, user.id))
    .orderBy(desc(schema.tableSessions.joinedAt)).limit(50);
  const out = [];
  for (const s of sessions) {
    const t = await db.select().from(schema.tables).where(eq(schema.tables.id, s.tableId));
    out.push({ ...s, tableName: t[0]?.name ?? '', tableCode: t[0]?.code ?? '' });
  }
  res.json({ sessions: out });
});

app.get('/api/me/sessions/:id', requireAuth, async (req, res) => {
  const user = (req as AuthedReq).userRow;
  const rows = await db.select().from(schema.tableSessions)
    .where(and(eq(schema.tableSessions.id, String(req.params.id)), eq(schema.tableSessions.userId, user.id)));
  const s = rows[0];
  if (!s) return res.status(404).json({ error: 'Không tìm thấy buổi chơi' });
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
});

app.get('/api/health', (_req, res) => res.json({ ok: true }));

// ---------- Socket.IO ----------
const io = new SocketServer(httpServer, { cors: { origin: CLIENT_URL, credentials: true } });
io.engine.use(sessionMiddleware);

function publicState(t: GameTable, viewerId: string) {
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
        handName: shown && t.lastResult?.showdownInfo?.[p.userId] ? t.lastResult.showdownInfo[p.userId] : null,
      };
    }),
    spectatorCount: t.spectators.size,
  };
}

function broadcastState(t: GameTable) {
  const room = io.sockets.adapter.rooms.get(`table:${t.cfg.code}`);
  if (!room) return;
  for (const socketId of room) {
    const s = io.sockets.sockets.get(socketId);
    const uid = (s as unknown as { userId?: string })?.userId;
    if (s && uid) s.emit('table:state', publicState(t, uid));
  }
  scheduleTurnTimer(t);
}

function scheduleTurnTimer(t: GameTable) {
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
    } catch (e) { console.error('auto action failed', e); }
  }, p.connected ? 30_000 : 1_000);
  turnTimers.set(key, timer);
}

io.on('connection', async (socket) => {
  const sess = (socket.request as unknown as { session?: { userId?: string } }).session;
  const userId = sess?.userId;
  if (!userId) { socket.emit('error', { message: 'Chưa đăng nhập' }); socket.disconnect(); return; }
  const user = await getUserById(userId);
  if (!user) { socket.disconnect(); return; }
  (socket as unknown as { userId: string }).userId = userId;
  let currentCode: string | null = null;

  const fail = (message: string) => socket.emit('error', { message });

  socket.on('table:join', async (payload: { code: string; mode?: string; buyIn?: number }) => {
    try {
      const row = await getTableRow(String(payload?.code ?? ''));
      if (!row) return fail('Không tìm thấy bàn');
      const t = await loadOrCreateTableState(row);
      currentCode = t.cfg.code;
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
      const seat: SeatPlayer = {
        userId, name: user.name, avatarUrl: user.avatarUrl,
        seatIndex, stack: buyIn, sessionId: sessionRow.id,
        connected: true, reservedUntil: null, sittingOut: false,
        inHand: false, holeCards: [], folded: false, allIn: false,
        betStreet: 0, totalContributed: 0, acted: false, showCards: false, lastAction: null,
      };
      t.seats.set(seatIndex, seat);
      t.spectators.delete(userId);
      broadcastState(t);
    } catch (e) { console.error(e); fail('Có lỗi khi vào bàn'); }
  });

  socket.on('table:spectate', async (payload: { code: string }) => {
    socket.emit('table:join-hint', { ok: true });
    // handled via table:join with mode spectator from client; kept for clarity
    void payload;
  });

  socket.on('player:rebuy', async (payload: { amount: number }) => {
    try {
      if (!currentCode) return;
      const t = tablesByCode.get(currentCode);
      if (!t) return;
      const p = t.playerByUser(userId);
      if (!p) return fail('Bạn chưa ngồi vào bàn');
      if (t.handInProgress && p.inHand && !p.folded) return fail('Chỉ mua thêm chip giữa hai ván');
      if (t.handInProgress && p.inHand && p.stack > 0) return fail('Chỉ mua thêm chip giữa hai ván hoặc khi hết chip');
      const amount = Number(payload.amount ?? 0);
      if (!amount || amount <= 0) return fail('Số chip không hợp lệ');
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
    } catch (e) { console.error(e); fail('Có lỗi khi mua thêm chip'); }
  });

  socket.on('host:start', async () => {
    if (!currentCode) return;
    const t = tablesByCode.get(currentCode);
    if (!t) return;
    if (t.cfg.hostId !== userId) return fail('Chỉ chủ bàn mới bắt đầu ván được');
    const chk = t.canStart();
    if (!chk.ok) return fail(chk.reason ?? 'Chưa đủ điều kiện bắt đầu');
    try { t.startHand(); } catch (e) { fail((e as Error).message); }
  });

  socket.on('player:action', async (payload: { action: string; amount?: number }) => {
    if (!currentCode) return;
    const t = tablesByCode.get(currentCode);
    if (!t) return;
    try {
      t.applyAction(userId, payload.action as never, payload.amount);
    } catch (e) { fail((e as Error).message); }
  });

  socket.on('player:sitout', async (payload: { sittingOut: boolean }) => {
    if (!currentCode) return;
    const t = tablesByCode.get(currentCode);
    const p = t?.playerByUser(userId);
    if (p) { p.sittingOut = Boolean(payload.sittingOut); broadcastState(t!); }
  });

  socket.on('player:leave', async () => {
    if (!currentCode) return;
    const t = tablesByCode.get(currentCode);
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
    await socket.leave(`table:${currentCode}`);
    currentCode = null;
  });

  socket.on('disconnect', async () => {
    if (!currentCode) return;
    const t = tablesByCode.get(currentCode);
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
});

httpServer.listen(PORT, () => {
  console.log(`Poker API listening on http://localhost:${PORT} (devAuth=${DEV_AUTH})`);
});
