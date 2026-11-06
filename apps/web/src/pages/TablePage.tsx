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
  const myTurn = state?.turnUserId === user?.id && state?.handInProgress;

  useEffect(() => {
    if (state && me && myTurn) {
      setRaiseTo(Math.min(state.minRaiseTo, me.bet + me.stack));
    }
  }, [state?.turnUserId, state?.handNumber, state?.street]); // eslint-disable-line react-hooks/exhaustive-deps

  const doJoin = (asSpectator: boolean) => {
    setError('');
    socketRef.current?.emit('table:join', {
      code, mode: asSpectator ? 'spectator' : 'player', buyIn: asSpectator ? undefined : buyIn,
    });
    setJoined(true);
  };

  const act = (action: string, amount?: number) => {
    socketRef.current?.emit('player:action', { action, amount });
  };

  if (!user) return <div className="text-center py-16 text-neutral-400">Hãy đăng nhập trước khi vào bàn.</div>;

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

  const renderSeat = (p: PlayerState, mine: boolean) => (
    <div key={p.userId} className="flex flex-col items-center">
      <div className={`${mine ? 'w-52' : 'w-36'} rounded-xl px-2 py-2 text-center bg-black/70 border ${p.isTurn ? 'border-emerald-400 shadow-[0_0_16px_rgba(52,211,153,0.5)]' : 'border-white/15'} ${p.folded ? 'opacity-50' : ''}`}>
        <div className="flex items-center justify-center gap-1.5">
          <span title={p.connected ? 'Đang trực tuyến' : 'Mất kết nối'} className={`w-2.5 h-2.5 rounded-full shrink-0 ${p.connected ? 'bg-emerald-400' : 'bg-red-500'}`} />
          {p.avatarUrl ? <img src={p.avatarUrl} alt="" className="w-6 h-6 rounded-full" /> : <span className="w-6 h-6 rounded-full bg-neutral-700 inline-flex items-center justify-center text-xs">{p.name[0]}</span>}
          <span className={`${mine ? 'text-base' : 'text-sm'} font-semibold truncate max-w-24`}>{p.name}</span>
          {p.isDealer && <span className="text-[10px] bg-white text-black rounded-full px-1.5 font-bold">D</span>}
          {p.sittingOut && <span className="text-[10px] bg-neutral-700 rounded px-1">Vắng</span>}
          {p.allIn && <span className="text-[10px] bg-red-700 rounded px-1">All-in</span>}
        </div>
        <div className="text-xs text-neutral-300">{fmt(p.stack)} chip</div>
        {p.isTurn && state?.turnDeadline && (
          <div className="h-1 bg-white/10 rounded mt-1 overflow-hidden">
            <div className="h-full bg-emerald-400 transition-all" style={{ width: `${timerPct}%` }} />
          </div>
        )}
        {(p.cards || p.cardsHidden) && (
          <div className="flex gap-1 justify-center mt-1">
            {p.cards
              ? p.cards.map((c, j) => mine ? <PlayingCard key={j} card={c} /> : <PlayingCard key={j} card={c} small />)
              : [<PlayingCard key="a" faceDown small />, <PlayingCard key="b" faceDown small />]}
          </div>
        )}
        {p.handName && <div className="text-[11px] text-emerald-300 mt-0.5">{p.handName}</div>}
        {p.lastAction && p.inHand && <div className="text-[11px] text-neutral-400">{ACTION_VI[p.lastAction] ?? p.lastAction}</div>}
      </div>
      {p.bet > 0 && (
        <div className="mt-1 text-xs text-neutral-100 bg-black/50 rounded-full px-2 py-0.5">Cược: {fmt(p.bet)} chip</div>
      )}
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="flex items-center gap-4 mb-4 flex-wrap">
        <h1 className="text-xl font-bold">{state?.name ?? 'Bàn poker'}</h1>
        <span className="text-neutral-400 text-sm">Mã mời: <b className="text-white tracking-widest">{code}</b></span>
        {state && <span className="text-neutral-400 text-sm">Blind {state.smallBlind}/{state.bigBlind} · Buy-in tối thiểu {fmt(state.minBuyIn)}</span>}
        {state && <span className="text-neutral-400 text-sm">{state.spectatorCount} người xem</span>}
        <div className="ml-auto flex gap-2">
          <button className="text-sm bg-neutral-800 hover:bg-neutral-700 rounded-lg px-3 py-1.5"
            onClick={() => { socketRef.current?.emit('player:leave'); navigate('/phong-cho'); }}>Rời bàn</button>
        </div>
      </div>

      {error && <div className="bg-red-950 border border-red-800 text-red-200 rounded-lg px-4 py-2 mb-4 text-sm">{error}</div>}

      {!joined && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 max-w-md mx-auto text-center">
          {mode === 'spectator' ? (
            <>
              <p className="mb-4 text-neutral-300">Xem bàn này với tư cách khán giả. Bạn sẽ không thấy bài tẩy của bất kỳ ai.</p>
              <button className="bg-blue-700 hover:bg-blue-600 rounded-lg px-6 py-2.5 font-semibold" onClick={() => doJoin(true)}>Vào xem</button>
            </>
          ) : (
            <>
              <p className="mb-1 font-semibold">Mua chip vào bàn</p>
              <p className="text-sm text-neutral-400 mb-4">Nhập số chip mang vào (tối thiểu {state ? fmt(state.minBuyIn) : '—'}). Chip chỉ dùng trong bàn này, rời bàn sẽ được ghi vào lịch sử.</p>
              <input type="number" className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 mb-3 text-center text-lg"
                value={buyIn} onChange={(e) => setBuyIn(Number(e.target.value))} />
              <button className="w-full bg-emerald-700 hover:bg-emerald-600 rounded-lg py-2.5 font-semibold" onClick={() => doJoin(false)}>Mua chip & ngồi vào bàn</button>
              <button className="w-full mt-2 text-sm text-neutral-400 hover:text-white" onClick={() => doJoin(true)}>Chỉ xem, không chơi</button>
            </>
          )}
        </div>
      )}

      {joined && state?.isSpectator && (
        <div className="bg-blue-950 border border-blue-800 text-blue-200 rounded-lg px-4 py-2 mb-4 text-sm">
          Bạn đang xem bàn — bài tẩy của người chơi được giữ kín, chỉ hiện khi lật bài ở showdown.
        </div>
      )}

      {joined && state && (
        <>
          {/* Rectangular felt table */}
          <div className="mx-auto rounded-3xl bg-[#14532d] border-[10px] border-[#3f2d20] shadow-[inset_0_0_80px_rgba(0,0,0,0.6)] px-3 py-4 flex flex-col gap-3"
            style={{ width: 'min(920px, 96vw)', minHeight: 520 }}>
            {/* top edge: all other players + empty seats */}
            <div className="flex flex-wrap justify-center items-start gap-2">
              {topEntries.map((e) => e.player ? renderSeat(e.player, false) : (
                <div key={e.seatIndex} className="w-28 text-center text-neutral-500 text-xs border border-dashed border-white/15 rounded-xl py-3 bg-black/30">Ghế trống</div>
              ))}
            </div>
            {/* center: board + pot */}
            <div className="flex-1 flex flex-col items-center justify-center text-center py-2">
              <div className="flex gap-1.5 justify-center mb-2">
                {[0, 1, 2, 3, 4].map((i) => state.board[i]
                  ? <PlayingCard key={i} card={state.board[i]} />
                  : <div key={i} className="w-12 h-16 rounded-md border border-white/15 bg-black/20" />)}
              </div>
              <div className="text-sm text-emerald-200/80">{state.street ? STREET_VI[state.street] : 'Đang chờ bắt đầu'}</div>
              <div className="font-bold text-lg">Pot: {fmt(state.pot)} chip</div>
              {state.handNumber > 0 && <div className="text-xs text-neutral-300">Ván #{state.handNumber}</div>}
            </div>
            {/* bottom edge: current player */}
            {bottomPlayer && (
              <div className="flex justify-center">
                {renderSeat(bottomPlayer, true)}
              </div>
            )}
          </div>

          {/* host controls / waiting */}
          {!state.handInProgress && (
            <div className="text-center mt-6 space-y-3">
              {state.street === 'showdown' && state.lastResult && (
                <div className="bg-white/5 border border-emerald-800 rounded-xl px-4 py-3 max-w-lg mx-auto">
                  <div className="font-semibold mb-1">Kết quả ván #{state.lastResult.handNumber} — Pot {fmt(state.lastResult.totalPot)} chip</div>
                  {state.lastResult.winners.map((w) => (
                    <div key={w.userId} className="text-sm text-emerald-300">
                      {w.name} thắng {fmt(w.amount)} chip{w.handName ? ` với ${w.handName}` : ''}
                    </div>
                  ))}
                </div>
              )}
              {isHost ? (
                <>
                  <button
                    disabled={!state.canStart.ok}
                    className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-neutral-700 disabled:text-neutral-400 rounded-lg px-8 py-3 font-bold text-lg"
                    onClick={() => socketRef.current?.emit('host:start')}
                  >Bắt đầu ván</button>
                  {!state.canStart.ok && <div className="text-sm text-neutral-400">{state.canStart.reason}</div>}
                </>
              ) : (
                <div className="text-neutral-400">Đang chờ chủ bàn bắt đầu ván…</div>
              )}
              {me && (
                <div className="flex items-center justify-center gap-2">
                  <input type="number" className="bg-black/30 border border-white/10 rounded-lg px-3 py-2 w-32 text-center"
                    value={rebuyAmount} onChange={(e) => setRebuyAmount(Number(e.target.value))} />
                  <button className="bg-blue-700 hover:bg-blue-600 rounded-lg px-4 py-2 font-semibold"
                    onClick={() => socketRef.current?.emit('player:rebuy', { amount: rebuyAmount })}>Mua thêm chip</button>
                </div>
              )}
            </div>
          )}

          {/* action bar */}
          {myTurn && me && (
            <div className="fixed bottom-0 left-0 right-0 bg-black/85 border-t border-white/10 backdrop-blur z-40">
              <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-2 flex-wrap justify-center">
                <span className="text-sm text-neutral-300 mr-2">Tới lượt bạn · cần theo: <b>{fmt(toCall)}</b></span>
                <button className="bg-red-800 hover:bg-red-700 rounded-lg px-5 py-2.5 font-semibold" onClick={() => act('fold')}>Úp bỏ (Fold)</button>
                {toCall === 0
                  ? <button className="bg-neutral-700 hover:bg-neutral-600 rounded-lg px-5 py-2.5 font-semibold" onClick={() => act('check')}>Check</button>
                  : <button className="bg-blue-700 hover:bg-blue-600 rounded-lg px-5 py-2.5 font-semibold" onClick={() => act('call')}>Call {fmt(toCall)}</button>}
                <div className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-1.5">
                  <span className="text-sm">Raise tới</span>
                  <input type="range" min={Math.min(state.minRaiseTo, me.bet + me.stack)} max={me.bet + me.stack} value={raiseTo}
                    onChange={(e) => setRaiseTo(Number(e.target.value))} className="w-36" />
                  <input type="number" className="bg-black/40 border border-white/10 rounded px-2 py-1 w-24 text-center" value={raiseTo}
                    onChange={(e) => setRaiseTo(Number(e.target.value))} />
                  <button className="bg-emerald-700 hover:bg-emerald-600 rounded-lg px-4 py-1.5 font-semibold" onClick={() => act('raise', raiseTo)}>Raise</button>
                </div>
                <button className="bg-red-600 hover:bg-red-500 rounded-lg px-5 py-2.5 font-bold" onClick={() => act('allin')}>All-in {fmt(me.stack)}</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
