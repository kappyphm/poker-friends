import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { io, type Socket } from 'socket.io-client';
import { api, fmt } from '../lib';
import { useAuth } from '../App';
import { PlayingCard } from '../components/cards';

interface PlayerState {
  userId: string; name: string; avatarUrl: string | null; seatIndex: number;
  stack: number; connected: boolean; sittingOut: boolean; inHand: boolean;
  folded: boolean; allIn: boolean; bet: number; totalContributed: number;
  lastAction: string | null; isDealer: boolean; isTurn: boolean;
  cards: string[] | null; cardsHidden: boolean; handName: string | null;
}
interface TableState {
  code: string; name: string; hostId: string; seatsCount: number;
  minBuyIn: number; smallBlind: number; bigBlind: number;
  handInProgress: boolean; street: string | null; board: string[];
  pot: number; currentBet: number; minRaiseTo: number;
  turnUserId: string | null; turnDeadline: number | null;
  dealerSeat: number; handNumber: number;
  canStart: { ok: boolean; reason?: string };
  isSpectator: boolean;
  lastResult: { handNumber: number; totalPot: number; board: string[]; winners: { userId: string; name: string; amount: number; handName: string | null }[] } | null;
  players: PlayerState[];
  spectatorCount: number;
}

const STREET_VI: Record<string, string> = {
  preflop: 'Pre-flop', flop: 'Flop', turn: 'Turn', river: 'River', showdown: 'Showdown',
};
const ACTION_VI: Record<string, string> = {
  fold: 'Úp bỏ', check: 'Check', call: 'Call', raise: 'Raise', 'all-in': 'All-in',
  'small-blind': 'Small Blind', 'big-blind': 'Big Blind',
};

export default function TablePage() {
  const { code } = useParams();
  const [params] = useSearchParams();
  const mode = params.get('mode');
  const { user } = useAuth();
  const navigate = useNavigate();
  const socketRef = useRef<Socket | null>(null);
  const [state, setState] = useState<TableState | null>(null);
  const [error, setError] = useState('');
  const [buyIn, setBuyIn] = useState(1000);
  const [joined, setJoined] = useState(false);
  const [raiseTo, setRaiseTo] = useState(0);
  const [showRaise, setShowRaise] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [rebuyAmount, setRebuyAmount] = useState(500);

  useEffect(() => {
    api<{ table: { minBuyIn: number } }>(`/api/tables/code/${code}`)
      .then((d) => setBuyIn(Math.max(d.table.minBuyIn, d.table.minBuyIn * 5)))
      .catch((e) => setError((e as Error).message));
  }, [code]);

  useEffect(() => {
    if (!user) return;
    const socket = io({ withCredentials: true });
    socketRef.current = socket;
    socket.on('table:state', (s: TableState) => setState(s));
    socket.on('error', (e: { message: string }) => setError(e.message));
    return () => { socket.disconnect(); };
  }, [user]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(t);
  }, []);

  const me = state?.players.find((p) => p.userId === user?.id);
  const isHost = state?.hostId === user?.id;
  const myTurn = Boolean(state?.turnUserId === user?.id && state?.handInProgress);

  // When my turn arrives, preset the raise amount to the legal minimum;
  // when it passes, make sure the raise modal is closed.
  useEffect(() => {
    if (state && me && myTurn) {
      setRaiseTo(Math.min(state.minRaiseTo, me.bet + me.stack));
    }
    if (!myTurn) setShowRaise(false);
  }, [myTurn, state?.street, state?.handNumber]); // eslint-disable-line react-hooks/exhaustive-deps

  const doJoin = (asSpectator: boolean) => {
    setError('');
    socketRef.current?.emit('table:join', {
      code, mode: asSpectator ? 'spectator' : 'player', buyIn: asSpectator ? undefined : buyIn,
    });
    setJoined(true);
  };

  const act = (action: string, amount?: number) => {
    socketRef.current?.emit('player:action', { action, amount });
    setShowRaise(false);
  };

  if (!user) return <div className="text-center py-16 text-muted">Hãy đăng nhập trước khi vào bàn.</div>;

  const toCall = state && me ? state.currentBet - me.bet : 0;
  const timerPct = state?.turnDeadline ? Math.max(0, Math.min(100, ((state.turnDeadline - now) / 30000) * 100)) : 0;

  const seatEntries = state
    ? Array.from({ length: state.seatsCount }, (_, i) => ({
        seatIndex: i,
        player: state.players.find((x) => x.seatIndex === i) ?? null,
      }))
    : [];
  const bottomPlayer = state && !state.isSpectator ? (me ?? null) : null;
  const topEntries = seatEntries.filter((e) => !bottomPlayer || !e.player || e.player.userId !== bottomPlayer.userId);

  const minRaise = state ? state.minRaiseTo : 0;
  const maxRaise = me ? me.bet + me.stack : 0;
  const canRaise = Boolean(me && state && minRaise < maxRaise);
  const raiseValid = canRaise && raiseTo >= minRaise && raiseTo <= maxRaise;
  const showActionBar = Boolean(joined && state && me && !state.isSpectator && state.handInProgress);

  const renderInfoBox = (p: PlayerState, mine: boolean) => (
    <div key={p.userId} className={`${mine ? 'w-52' : 'w-36'} rounded-xl px-2 py-2 text-center bg-surface border ${p.isTurn ? 'border-accent shadow-[0_0_16px_rgba(127,199,155,0.55)]' : 'border-line'} ${p.folded ? 'opacity-50' : ''}`}>
      <div className="flex items-center justify-center gap-1.5">
        <span title={p.connected ? 'Đang trực tuyến' : 'Mất kết nối'} className={`w-2.5 h-2.5 rounded-full shrink-0 ${p.connected ? 'bg-emerald-400' : 'bg-red-400'}`} />
        {p.avatarUrl ? <img src={p.avatarUrl} alt="" className="w-6 h-6 rounded-full" /> : <span className="w-6 h-6 rounded-full bg-lav text-lavink inline-flex items-center justify-center text-xs">{p.name[0]}</span>}
        <span className={`${mine ? 'text-base' : 'text-sm'} font-semibold truncate max-w-24`}>{p.name}</span>
        {p.isDealer && <span className="text-[10px] bg-ink text-bg rounded-full px-1.5 font-bold">D</span>}
        {p.sittingOut && <span className="text-[10px] bg-inset text-muted border border-line rounded px-1">Vắng</span>}
        {p.allIn && <span className="text-[10px] bg-fold text-foldink rounded px-1">All-in</span>}
      </div>
      <div className="text-xs text-muted">{fmt(p.stack)} chip</div>
      {p.isTurn && state?.turnDeadline && (
        <div className="h-1 bg-inset rounded mt-1 overflow-hidden">
          <div className="h-full bg-accent transition-all" style={{ width: `${timerPct}%` }} />
        </div>
      )}
      {p.handName && <div className="text-[11px] text-win mt-0.5">{p.handName}</div>}
      {p.lastAction && p.inHand && <div className="text-[11px] text-muted">{ACTION_VI[p.lastAction] ?? p.lastAction}</div>}
    </div>
  );

  const renderTableCards = (p: PlayerState, mine: boolean) => (
    <div key={p.userId} className={`${mine ? 'w-52' : 'w-36'} flex flex-col items-center`}>
      {mine && p.bet > 0 && (
        <div className="mb-1 text-xs text-white bg-black/45 rounded-full px-2 py-0.5">Cược: {fmt(p.bet)} chip</div>
      )}
      {(p.cards || p.cardsHidden) && (
        <div className={`flex gap-1 justify-center rounded-lg p-1 border ${p.isTurn ? 'border-accent shadow-[0_0_16px_rgba(127,199,155,0.55)]' : 'border-transparent'} ${p.folded ? 'opacity-50' : ''}`}>
          {p.cards
            ? p.cards.map((c, j) => mine ? <PlayingCard key={j} card={c} large /> : <PlayingCard key={j} card={c} small />)
            : [<PlayingCard key="a" faceDown small />, <PlayingCard key="b" faceDown small />]}
        </div>
      )}
      {!mine && p.bet > 0 && (
        <div className="mt-1 text-xs text-white bg-black/45 rounded-full px-2 py-0.5">Cược: {fmt(p.bet)} chip</div>
      )}
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 min-h-[calc(100dvh-3.5rem)] flex flex-col">
      <div className="flex items-center gap-4 mb-4 flex-wrap">
        <h1 className="text-xl font-bold">{state?.name ?? 'Bàn poker'}</h1>
        <span className="text-muted text-sm">Mã mời: <b className="tracking-widest">{code}</b></span>
        {state && <span className="text-muted text-sm">Blind {state.smallBlind}/{state.bigBlind} · Buy-in tối thiểu {fmt(state.minBuyIn)}</span>}
        {state && <span className="text-muted text-sm">{state.spectatorCount} người xem</span>}
        <div className="ml-auto flex gap-2">
          <button className="text-sm bg-inset border border-line hover:brightness-95 rounded-lg px-3 py-1.5"
            onClick={() => { socketRef.current?.emit('player:leave'); navigate('/phong-cho'); }}>Rời bàn</button>
        </div>
      </div>

      {error && <div className="bg-dangerbg border border-dangerline text-dangerink rounded-lg px-4 py-2 mb-4 text-sm">{error}</div>}

      {!joined && (
        <div className="bg-surface border border-line rounded-2xl p-6 max-w-md mx-auto text-center">
          {mode === 'spectator' ? (
            <>
              <p className="mb-4 text-muted">Xem bàn này với tư cách khán giả. Bạn sẽ không thấy bài tẩy của bất kỳ ai.</p>
              <button className="bg-lav text-lavink hover:brightness-95 rounded-lg px-6 py-2.5 font-semibold" onClick={() => doJoin(true)}>Vào xem</button>
            </>
          ) : (
            <>
              <p className="mb-1 font-semibold">Mua chip vào bàn</p>
              <p className="text-sm text-muted mb-4">Nhập số chip mang vào (tối thiểu {state ? fmt(state.minBuyIn) : '—'}). Chip chỉ dùng trong bàn này, rời bàn sẽ được ghi vào lịch sử.</p>
              <input type="number" className="w-full bg-inset border border-line rounded-lg px-3 py-2 mb-3 text-center text-lg"
                value={buyIn} onChange={(e) => setBuyIn(Number(e.target.value))} />
              <button className="w-full bg-accent text-accentink hover:brightness-95 rounded-lg py-2.5 font-semibold" onClick={() => doJoin(false)}>Mua chip & ngồi vào bàn</button>
              <button className="w-full mt-2 text-sm text-muted hover:text-ink" onClick={() => doJoin(true)}>Chỉ xem, không chơi</button>
            </>
          )}
        </div>
      )}

      {joined && state?.isSpectator && (
        <div className="bg-infobg border border-infoline text-infoink rounded-lg px-4 py-2 mb-4 text-sm">
          Bạn đang xem bàn — bài tẩy của người chơi được giữ kín, chỉ hiện khi lật bài ở showdown.
        </div>
      )}

      {joined && state && (
        <div className={`flex-1 flex flex-col justify-center ${showActionBar ? 'pb-24' : ''}`}>
          {/* Rectangular felt table: info boxes outside the felt, cards inside at the edges */}
          <div className="mx-auto" style={{ width: 'min(920px, 96vw)' }}>
            {/* top edge, outside the felt: info boxes of other players + empty seats */}
            <div className="flex flex-wrap justify-center items-end gap-2 mb-2">
              {topEntries.map((e) => e.player ? renderInfoBox(e.player, false) : (
                <div key={e.seatIndex} className="w-36 text-center text-muted text-xs border border-dashed border-line rounded-xl py-3 bg-surface">Ghế trống</div>
              ))}
            </div>
            <div className="rounded-3xl bg-felt border-[10px] border-rail shadow-[inset_0_0_80px_rgba(0,0,0,0.3)] px-3 py-3 flex flex-col gap-2" style={{ minHeight: 420 }}>
              {/* inside the top edge: hole cards of other players */}
              <div className="flex flex-wrap justify-center items-start gap-2 min-h-24">
                {topEntries.map((e) => e.player ? renderTableCards(e.player, false) : (
                  <div key={e.seatIndex} className="w-36" />
                ))}
              </div>
              {/* center: board + pot */}
              <div className="flex-1 flex flex-col items-center justify-center text-center py-2 text-feltink">
                <div className="flex gap-1.5 justify-center mb-2">
                  {[0, 1, 2, 3, 4].map((i) => state.board[i]
                    ? <PlayingCard key={i} card={state.board[i]} />
                    : <div key={i} className="w-14 h-[4.75rem] rounded-md border-2 border-dashed" style={{ borderColor: 'var(--felt-muted)', background: 'rgba(0,0,0,0.08)' }} />)}
                </div>
                <div className="text-sm text-feltmuted">{state.street ? STREET_VI[state.street] : 'Đang chờ bắt đầu'}</div>
                <div className="font-bold text-lg">Pot: {fmt(state.pot)} chip</div>
                {state.handNumber > 0 && <div className="text-xs text-feltmuted">Ván #{state.handNumber}</div>}
              </div>
              {/* inside the bottom edge: current player's hole cards */}
              {bottomPlayer && (
                <div className="flex justify-center">
                  {renderTableCards(bottomPlayer, true)}
                </div>
              )}
            </div>
            {/* bottom edge, outside the felt: current player's info box */}
            {bottomPlayer && (
              <div className="flex justify-center mt-2">
                {renderInfoBox(bottomPlayer, true)}
              </div>
            )}
          </div>

          {/* host controls / waiting */}
          {!state.handInProgress && (
            <div className="text-center mt-6 space-y-3">
              {state.street === 'showdown' && state.lastResult && (
                <div className="bg-surface border border-line rounded-xl px-4 py-3 max-w-lg mx-auto">
                  <div className="font-semibold mb-1">Kết quả ván #{state.lastResult.handNumber} — Pot {fmt(state.lastResult.totalPot)} chip</div>
                  {state.lastResult.winners.map((w) => (
                    <div key={w.userId} className="text-sm text-win">
                      {w.name} thắng {fmt(w.amount)} chip{w.handName ? ` với ${w.handName}` : ''}
                    </div>
                  ))}
                </div>
              )}
              {isHost ? (
                <>
                  <button
                    disabled={!state.canStart.ok}
                    className="bg-accent text-accentink hover:brightness-95 disabled:bg-inset disabled:text-muted rounded-lg px-8 py-3 font-bold text-lg"
                    onClick={() => socketRef.current?.emit('host:start')}
                  >Bắt đầu ván</button>
                  {!state.canStart.ok && <div className="text-sm text-muted">{state.canStart.reason}</div>}
                </>
              ) : (
                <div className="text-muted">Đang chờ chủ bàn bắt đầu ván…</div>
              )}
              {me && (
                <div className="flex items-center justify-center gap-2">
                  <input type="number" className="bg-inset border border-line rounded-lg px-3 py-2 w-32 text-center"
                    value={rebuyAmount} onChange={(e) => setRebuyAmount(Number(e.target.value))} />
                  <button className="bg-lav text-lavink hover:brightness-95 rounded-lg px-4 py-2 font-semibold"
                    onClick={() => socketRef.current?.emit('player:rebuy', { amount: rebuyAmount })}>Mua thêm chip</button>
                </div>
              )}
            </div>
          )}

          {/* action bar: exactly 3 actions — Fold, Call/Check, Raise */}
          {showActionBar && me && (
            <div className="fixed bottom-0 left-0 right-0 bg-surface/90 border-t border-line backdrop-blur z-40">
              <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3 flex-wrap justify-center">
                <span className="text-sm text-muted mr-1">
                  {myTurn
                    ? <>Tới lượt bạn · cần theo: <b className="text-ink">{fmt(toCall)}</b></>
                    : 'Chưa tới lượt bạn'}
                </span>
                <button
                  disabled={!myTurn}
                  className="bg-fold text-foldink hover:brightness-95 disabled:opacity-40 disabled:hover:brightness-100 rounded-2xl px-7 py-3 text-lg font-bold shadow-sm"
                  onClick={() => act('fold')}
                >Úp bỏ (Fold)</button>
                <button
                  disabled={!myTurn}
                  className="bg-call text-callink hover:brightness-95 disabled:opacity-40 disabled:hover:brightness-100 rounded-2xl px-7 py-3 text-lg font-bold shadow-sm"
                  onClick={() => act(toCall === 0 ? 'check' : 'call')}
                >{toCall === 0 ? 'Check' : `Call ${fmt(toCall)}`}</button>
                <button
                  disabled={!myTurn}
                  className="bg-raise text-raiseink hover:brightness-95 disabled:opacity-40 disabled:hover:brightness-100 rounded-2xl px-7 py-3 text-lg font-bold shadow-sm"
                  onClick={() => { setRaiseTo(canRaise ? Math.max(minRaise, Math.min(raiseTo || minRaise, maxRaise)) : maxRaise); setShowRaise(true); }}
                >Raise</button>
              </div>
            </div>
          )}

          {/* raise modal */}
          {showRaise && myTurn && me && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center px-4" onClick={() => setShowRaise(false)}>
              <div className="bg-surface border border-line rounded-3xl shadow-2xl w-[min(430px,94vw)] p-6" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold">Raise tới</h2>
                  <button type="button" aria-label="Đóng" className="w-8 h-8 rounded-full bg-inset border border-line flex items-center justify-center hover:brightness-95" onClick={() => setShowRaise(false)}>×</button>
                </div>
                <input
                  type="number"
                  className="w-full bg-inset border border-line rounded-2xl px-4 py-4 text-5xl font-bold text-center"
                  value={raiseTo}
                  min={minRaise}
                  max={maxRaise}
                  onChange={(e) => setRaiseTo(Number(e.target.value))}
                />
                <input
                  type="range"
                  className="w-full mt-5"
                  min={Math.min(minRaise, maxRaise)}
                  max={maxRaise}
                  value={Math.max(Math.min(minRaise, maxRaise), Math.min(raiseTo, maxRaise))}
                  onChange={(e) => setRaiseTo(Number(e.target.value))}
                />
                <div className="text-center text-sm text-muted mt-2">
                  Tối thiểu {fmt(minRaise)} chip · Tối đa {fmt(maxRaise)} chip
                </div>
                {!canRaise && (
                  <div className="text-center text-sm text-muted mt-2">Số chip còn lại không đủ để raise — bạn chỉ có thể All-in.</div>
                )}
                <div className="flex gap-3 mt-6">
                  <button
                    className="flex-1 bg-lav text-lavink hover:brightness-95 rounded-2xl px-4 py-3.5 text-lg font-bold shadow-sm"
                    onClick={() => act('allin')}
                  >All-in</button>
                  <button
                    disabled={!raiseValid}
                    className="flex-1 bg-raise text-raiseink hover:brightness-95 disabled:opacity-40 disabled:hover:brightness-100 rounded-2xl px-4 py-3.5 text-lg font-bold shadow-sm"
                    onClick={() => act('raise', raiseTo)}
                  >Raise</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
