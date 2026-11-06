// End-to-end test: 3 players + 1 spectator via dev-login.
// Run: node scripts/e2e.mjs   (API must be running on :4000 with DEV_AUTH=true)
import { io } from 'socket.io-client';

const API = 'http://localhost:4000';
const results = [];
function check(name, cond, detail = '') {
  results.push({ name, pass: Boolean(cond), detail });
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
  if (!cond) process.exitCode = 1;
}

async function login(name) {
  const res = await fetch(`${API}/api/auth/dev-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error(`dev-login ${name} failed: ${res.status}`);
  const cookies = res.headers.getSetCookie().map((c) => c.split(';')[0]).join('; ');
  const data = await res.json();
  return { cookie: cookies, user: data.user };
}

function connect(cookie) {
  return new Promise((resolve, reject) => {
    const socket = io(API, { extraHeaders: { Cookie: cookie }, transports: ['websocket', 'polling'] });
    const client = { socket, state: null, states: [] };
    socket.on('table:state', (s) => { client.state = s; client.states.push(s); });
    socket.on('error', (e) => console.log('socket error:', e.message));
    socket.on('connect', () => resolve(client));
    socket.on('connect_error', reject);
    setTimeout(() => reject(new Error('connect timeout')), 10000);
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const names = ['E2E Host', 'E2E Player Two', 'E2E Player Three'];
  const accounts = [];
  for (const n of names) accounts.push(await login(n));
  const specAcc = await login('E2E Spectator');
  check('dev-login tạo 4 user', accounts.every((a) => a.user?.id) && Boolean(specAcc.user?.id));

  // host creates table
  const res = await fetch(`${API}/api/tables`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: accounts[0].cookie },
    body: JSON.stringify({ name: 'Bàn E2E', seats: 9, minBuyIn: 200, smallBlind: 5, bigBlind: 10 }),
  });
  const { table } = await res.json();
  check('tạo bàn thành công', Boolean(table?.code), `code=${table?.code}`);

  const clients = [];
  for (const acc of accounts) clients.push(await connect(acc.cookie));
  const spec = await connect(specAcc.cookie);

  for (const c of clients) c.socket.emit('table:join', { code: table.code, mode: 'player', buyIn: 1000 });
  spec.socket.emit('table:join', { code: table.code, mode: 'spectator' });
  await sleep(1500);

  const seated = clients[0].state?.players?.length ?? 0;
  check('3 người chơi đã ngồi vào bàn', seated === 3, `seated=${seated}`);
  check('khán giả ở chế độ xem', spec.state?.isSpectator === true);

  // host starts the hand
  clients[0].socket.emit('host:start');
  await sleep(1500);
  check('ván đã bắt đầu', clients[0].state?.handInProgress === true, `street=${clients[0].state?.street}`);

  const myCards = clients.map((c) => {
    const me = c.state?.players.find((p) => p.cards);
    return me?.cards ?? [];
  });
  check('mỗi người chơi thấy 2 lá bài tẩy của mình', myCards.every((cs) => cs.length === 2), JSON.stringify(myCards));

  // autoplay: check/call everything until showdown
  const deadline = Date.now() + 90_000;
  let finished = false;
  while (Date.now() < deadline) {
    for (let i = 0; i < 3; i++) {
      const st = clients[i].state;
      if (st?.handInProgress && st.turnUserId === accounts[i].user.id) {
        const meP = st.players.find((p) => p.userId === accounts[i].user.id);
        const toCall = st.currentBet - (meP?.bet ?? 0);
        clients[i].socket.emit('player:action', { action: toCall === 0 ? 'check' : 'call' });
        await sleep(200);
      }
    }
    if (clients[0].state && !clients[0].state.handInProgress && clients[0].state.street === 'showdown') {
      finished = true; break;
    }
    await sleep(200);
  }
  check('ván hoàn thành tới showdown', finished, `street=${clients[0].state?.street}`);

  const finalState = clients[0].state;
  const stackSum = finalState.players.reduce((s, p) => s + p.stack, 0);
  check('bảo toàn chip: tổng stack = tổng buy-in 3000', stackSum === 3000, `sum=${stackSum}`);
  check('pot ván > 0 và đã có người thắng', (finalState.lastResult?.totalPot ?? 0) > 0 && (finalState.lastResult?.winners?.length ?? 0) >= 1,
    `pot=${finalState.lastResult?.totalPot}, winners=${JSON.stringify(finalState.lastResult?.winners)}`);

  // spectator privacy: during the hand (street != showdown) spectator states must not contain any hole cards
  const holeStrings = myCards.flat();
  let leaked = false;
  for (const st of spec.states) {
    if (st.street && st.street !== 'showdown') {
      const json = JSON.stringify(st.players.map((p) => p.cards));
      if (holeStrings.some((c) => json.includes(`"${c}"`))) leaked = true;
      if (st.players.some((p) => p.cards !== null)) leaked = true;
    }
  }
  check('khán giả không bao giờ nhận được bài tẩy trong ván', !leaked);

  // persistence via history API
  await sleep(1000);
  for (let i = 0; i < 3; i++) {
    const r = await fetch(`${API}/api/me/sessions`, { headers: { Cookie: accounts[i].cookie } });
    const d = await r.json();
    const sess = d.sessions.find((s) => s.tableCode === table.code);
    check(`lịch sử của người chơi ${i + 1} có session với handsPlayed>=1`, Boolean(sess) && sess.handsPlayed >= 1,
      sess ? `handsPlayed=${sess.handsPlayed}, buyIn=${sess.totalBuyIn}` : 'không thấy session');
    if (i === 0 && sess) {
      const rd = await fetch(`${API}/api/me/sessions/${sess.id}`, { headers: { Cookie: accounts[i].cookie } });
      const dd = await rd.json();
      check('chi tiết session có ít nhất 1 ván đã lưu', (dd.hands?.length ?? 0) >= 1, `hands=${dd.hands?.length}, pot=${dd.hands?.[0]?.totalPot}`);
    }
  }

  const statsRes = await fetch(`${API}/api/me/stats`, { headers: { Cookie: accounts[0].cookie } });
  const stats = await statsRes.json();
  check('thống kê tổng của host có totalHands>=1', stats.totalHands >= 1, JSON.stringify(stats));

  for (const c of [...clients, spec]) c.socket.disconnect();
  const failed = results.filter((r) => !r.pass).length;
  console.log(`\nE2E SUMMARY: ${results.length - failed}/${results.length} checks passed`);
  if (failed) process.exit(1);
}

main().catch((e) => { console.error('E2E ERROR', e); process.exit(1); });
