import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { fmt } from '../lib/format';
import { useTableSocket } from '../hooks/useTableSocket';
import { OpponentChip, EmptySeatChip } from '../components/table/OpponentChip';
import { HeroZone } from '../components/table/HeroZone';
import { BoardArea } from '../components/table/BoardArea';
import { ActionBar } from '../components/table/ActionBar';
import { RaiseModal } from '../components/table/RaiseModal';
import { WaitingControls } from '../components/table/WaitingControls';
import { JoinPanel } from '../components/table/JoinPanel';

export default function TablePage() {
  const { code } = useParams();
  const [params] = useSearchParams();
  const mode = params.get('mode');
  const navigate = useNavigate();
  const { user, state, error, buyIn, setBuyIn, joined, now, doJoin, act, leaveTable, startHand, rebuy } = useTableSocket(code);
  const [raiseTo, setRaiseTo] = useState(0);
  const [showRaise, setShowRaise] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);

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

  const handleAct = (action: string, amount?: number) => {
    act(action, amount);
    setShowRaise(false);
  };

  const leave = () => { leaveTable(); navigate('/phong-cho'); };

  if (!user) return <div className="text-center py-16 text-muted">Hãy đăng nhập trước khi vào bàn.</div>;

  const toCall = state && me ? state.currentBet - me.bet : 0;
  const timerPct = state?.turnDeadline ? Math.max(0, Math.min(100, ((state.turnDeadline - now) / 30000) * 100)) : 0;

  // Display order: opponents are laid out along the top row in seat order
  // RELATIVE to the viewer — the viewer anchors the layout (hero zone at
  // the bottom) and the row starts with the seat right after the viewer's,
  // wrapping around, so turn order reads along the row and back to the
  // hero. Spectators anchor on the lowest occupied seat instead.
  const seatEntries = state
    ? Array.from({ length: state.seatsCount }, (_, i) => ({ seatIndex: i, player: state.players.find((x) => x.seatIndex === i) ?? null }))
    : [];
  let orderedEntries = seatEntries;
  if (state) {
    const n = state.seatsCount;
    const anchorSeat = me ? me.seatIndex : (seatEntries.find((e) => e.player)?.seatIndex ?? 0);
    const start = me ? (anchorSeat + 1) % n : anchorSeat;
    orderedEntries = Array.from({ length: n }, (_, k) => seatEntries[(start + k) % n])
      .filter((e) => !me || e.seatIndex !== me.seatIndex);
  }
  const compact = orderedEntries.length > 5;

  const minRaise = state ? state.minRaiseTo : 0;
  const maxRaise = me ? me.bet + me.stack : 0;
  const canRaise = Boolean(me && state && minRaise < maxRaise);
  const showActionBar = Boolean(joined && state && me && !state.isSpectator && state.handInProgress);

  return (
    <div className="w-full max-w-5xl mx-auto px-3 sm:px-4 pb-5 min-h-[calc(100dvh-4.75rem)] sm:min-h-[calc(100dvh-3.5rem)] flex flex-col">
      {/* top bar, mirroring the reference: back arrow left, menu right */}
      <div className="flex items-center gap-3 py-3">
        <button
          type="button"
          aria-label="Quay lại phòng chờ"
          className="w-10 h-10 shrink-0 rounded-full bg-surface border border-line flex items-center justify-center text-lg hover:bg-inset"
          onClick={leave}
        >←</button>
        <div className="min-w-0">
          <div className="font-bold truncate">{state?.name ?? 'Bàn poker'}</div>
          <div className="text-xs text-muted truncate">
            Mã mời <b className="tracking-widest text-ink">{code}</b>
            {state && <> · Blind {state.smallBlind}/{state.bigBlind} · Buy-in tối thiểu {fmt(state.minBuyIn)}</>}
          </div>
        </div>
        <div className="ml-auto relative shrink-0">
          <button
            type="button"
            aria-label="Menu bàn"
            className="w-10 h-10 rounded-full bg-surface border border-line flex items-center justify-center text-lg leading-none hover:bg-inset"
            onClick={() => setMenuOpen((v) => !v)}
          >…</button>
          {menuOpen && (
            <div className="absolute right-0 top-12 z-40 w-64 bg-surface border border-line rounded-2xl p-4 shadow-2xl text-sm space-y-2.5">
              <div className="flex justify-between gap-3"><span className="text-muted">Mã mời</span><b className="tracking-widest">{code}</b></div>
              {state && (
                <>
                  <div className="flex justify-between gap-3"><span className="text-muted">Blind</span><span>{state.smallBlind}/{state.bigBlind}</span></div>
                  <div className="flex justify-between gap-3"><span className="text-muted">Buy-in tối thiểu</span><span>{fmt(state.minBuyIn)} chip</span></div>
                  <div className="flex justify-between gap-3"><span className="text-muted">Số ghế</span><span>{state.seatsCount}</span></div>
                  <div className="flex justify-between gap-3"><span className="text-muted">Người xem</span><span>{state.spectatorCount}</span></div>
                </>
              )}
              <button
                type="button"
                className="w-full h-10 rounded-full bg-inset border border-line font-semibold hover:bg-[#2b2b2f]"
                onClick={() => {
                  void navigator.clipboard?.writeText(code ?? '').catch(() => {});
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }}
              >{copied ? 'Đã chép mã mời' : 'Sao chép mã mời'}</button>
              <button
                type="button"
                className="w-full h-10 rounded-full bg-inset border border-line font-semibold text-lose hover:bg-[#2b2b2f]"
                onClick={leave}
              >Rời bàn</button>
            </div>
          )}
        </div>
      </div>

      {error && <div className="bg-dangerbg border border-dangerline text-dangerink rounded-2xl px-4 py-2 mb-3 text-sm">{error}</div>}

      {!joined && (
        <div className="flex-1 flex items-center justify-center py-6">
          <JoinPanel mode={mode} minBuyIn={state?.minBuyIn ?? null} buyIn={buyIn} onBuyInChange={setBuyIn} onJoin={doJoin} />
        </div>
      )}

      {joined && state && (
        <div className="flex-1 flex flex-col">
          {/* opponents row (seat order relative to the viewer) */}
          <div className="flex flex-wrap justify-center gap-x-1.5 gap-y-3 pt-1">
            {orderedEntries.map((e) => e.player ? (
              <OpponentChip key={e.seatIndex} player={e.player} compact={compact} timerPct={timerPct} />
            ) : (
              <EmptySeatChip key={e.seatIndex} compact={compact} />
            ))}
          </div>

          {/* center zone: board during a hand, waiting panel between hands */}
          <div className="flex-1 flex flex-col justify-center py-4">
            {state.handInProgress ? (
              <BoardArea state={state} />
            ) : (
              <WaitingControls state={state} isHost={isHost} hasMe={Boolean(me)} onStart={startHand} onRebuy={rebuy} />
            )}
          </div>

          {/* action row: Fold / Check–Call / Raise + round raise button */}
          {showActionBar && me && (
            <ActionBar myTurn={myTurn} toCall={toCall} onAct={handleAct}
              onRaiseClick={() => { setRaiseTo(canRaise ? Math.max(minRaise, Math.min(raiseTo || minRaise, maxRaise)) : maxRaise); setShowRaise(true); }} />
          )}

          {/* hero zone: my cards + my info card (or the spectator card) */}
          {(me || state.isSpectator) && (
            <HeroZone player={me ?? null} spectator={state.isSpectator} timerPct={timerPct} />
          )}

          {/* raise modal */}
          {showRaise && myTurn && me && (
            <RaiseModal raiseTo={raiseTo} onRaiseToChange={setRaiseTo} minRaise={minRaise} maxRaise={maxRaise}
              canRaise={canRaise} onClose={() => setShowRaise(false)} onAct={handleAct} />
          )}
        </div>
      )}

      {joined && !state && <div className="flex-1 flex items-center justify-center text-muted">Đang tải bàn…</div>}
    </div>
  );
}
