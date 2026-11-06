// Barn plays ONE hand against the user: 3 bots (bot 1 = host) + the human.
// Run: node scripts/play-with-user.mjs   (API on :4000, DEV_AUTH=true)
import { io } from 'socket.io-client';

const API = 'http://localhost:4000';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.log(new Date().toISOString(), ...a);

async function login(name) {
  const res = await fetch(`${API}/api/auth/dev-login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error(`dev-login ${name}: ${res.status}`);
  const cookie = res.headers.getSetCookie().map((c) => c.split(';')[0]).join('; ');
  const data = await res.json();
  return { cookie, user: data.user };
}

function connect(cookie) {
  return new Promise((resolve, reject) => {
    const socket = io(API, { extraHeaders: { Cookie: cookie }, transports: ['websocket', 'polling'] });
    const client = { socket, state: null };
    socket.on('table:state', (s) => { client.state = s; });
    socket.on('error', (e) => log('socket error:', e.message));
    socket.on('connect', () => resolve(client));
    socket.on('connect_error', reject);
    setTimeout(() => reject(new Error('connect timeout')), 10000);
  });
}

const RANKS = { '2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,'T':10,'J':11,'Q':12,'K':13,'A':14 };
function handStrength(cards) {
  if (!cards || cards.length < 2) return 0;
  const r = cards.map((c) => RANKS[String(c)[0]] ?? 0);
  const s = cards.map((c) => String(c)[1]);
  let score = Math.max(...r);
  if (r[0] === r[1]) score = 30 + r[0] * 2;              // pocket pair
  else if (r.includes(14)) score = 22 + Math.min(...r);  // any ace
  else if (Math.min(...r) >= 11) score = 24;             // two face cards
  else if (s[0] === s[1]) score += 4;                    // suited
  else if (Math.abs(r[0] - r[1]) === 1) score += 3;      // connected
  return score;
}

async function main() {
  const names = ['Barn Bot 1', 'Barn Bot 2', 'Barn Bot 3'];
  const accounts = [];
  for (const n of names) accounts.push(await login(n));
  const botIds = new Set(accounts.map((a) => a.user.id));

  const res = await fetch(`${API}/api/tables`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: accounts[0].cookie },
    body: JSON.stringify({ name: 'Bàn chơi thử cùng Barn', seats: 6, minBuyIn: 200, smallBlind: 5, bigBlind: 10 }),
  });
  const { table } = await res.json();
  if (!table?.code) throw new Error('create table failed');
  log('TABLE_CODE=' + table.code);

  const clients = [];
  for (const acc of accounts) clients.push(await connect(acc.cookie));
  for (const c of clients) c.socket.emit('table:join', { code: table.code, mode: 'player', buyIn: 1000 });
  await sleep(1500);
  log('bots seated:', clients[0].state?.players?.length);

  // wait for the human to sit down with chips (max 15 min)
  const waitDeadline = Date.now() + 15 * 60_000;
  let human = null;
  while (Date.now() < waitDeadline) {
    const st = clients[0].state;
    human = st?.players?.find((p) => !botIds.has(p.userId) && p.stack > 0);
    if (human && st.players.filter((p) => p.stack > 0).length >= 4) break;
    await sleep(1000);
  }
  if (!human) { log('NO_HUMAN_JOINED'); process.exit(2); }
  log('human joined:', human.name, 'stack=', human.stack);
  await sleep(3000);
  clients[0].socket.emit('host:start');
  log('host started the hand');

  // play exactly one hand
  const actedFor = new Set();
  const deadline = Date.now() + 10 * 60_000;
  let finished = false;
  while (Date.now() < deadline) {
    const st = clients[0].state;
    if (st && !st.handInProgress && st.lastResult) { finished = true; break; }
    for (let i = 0; i < 3; i++) {
      const s = clients[i].state;
      if (!s?.handInProgress || s.turnUserId !== accounts[i].user.id) continue;
      const me = s.players.find((p) => p.userId === accounts[i].user.id);
      if (!me) continue;
      const sig = `${s.street}|${s.currentBet}|${me.bet}|${s.pot ?? ''}|${me.stack}`;
      if (actedFor.has(sig)) continue;
      actedFor.add(sig);
      await sleep(900 + Math.random() * 1400);
      const s2 = clients[i].state;
      if (!s2?.handInProgress || s2.turnUserId !== accounts[i].user.id) continue;
      const me2 = s2.players.find((p) => p.userId === accounts[i].user.id);
      const toCall = s2.currentBet - (me2?.bet ?? 0);
      const str = handStrength(me2?.cards);
      const maxTo = (me2?.bet ?? 0) + (me2?.stack ?? 0);
      let act = null;
      if (toCall === 0) {
        if (str >= 26 && Math.random() < 0.6) {
          const to = Math.min(maxTo, Math.max(s2.currentBet + 20, 20));
          act = to >= maxTo ? { action: 'allin' } : { action: 'raise', amount: to };
        } else act = { action: 'check' };
      } else if (toCall >= me2.stack) {
        act = str >= 20 ? { action: 'call' } : { action: 'fold' };
      } else if (str >= 30 && Math.random() < 0.35) {
        const to = Math.min(maxTo, s2.currentBet * 2 + 20);
        act = to >= maxTo ? { action: 'allin' } : { action: 'raise', amount: to };
      } else if (toCall <= me2.stack * 0.2 || str >= 18) {
        act = { action: 'call' };
      } else if (Math.random() < 0.25) {
        act = { action: 'call' };
      } else {
        act = { action: 'fold' };
      }
      log(`bot${i + 1} (${me2.cards}) street=${s2.street} toCall=${toCall} ->`, JSON.stringify(act));
      clients[i].socket.emit('player:action', act);
      await sleep(250);
    }
    await sleep(200);
  }

  const fin = clients[0].state;
  log('HAND_FINISHED=' + finished);
  if (fin?.lastResult) log('RESULT=' + JSON.stringify(fin.lastResult));
  if (fin?.players) log('FINAL_STACKS=' + JSON.stringify(fin.players.map((p) => ({ name: p.name, stack: p.stack }))));
  await sleep(3000);
  for (const c of clients) c.socket.disconnect();
  log('DONE');
  process.exit(0);
}

main().catch((e) => { console.error('PLAY ERROR', e); process.exit(1); });
