import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { fmt } from '../lib/format';
import { useTableSocket } from '../hooks/useTableSocket';
import { SeatInfoBox } from '../components/table/SeatInfoBox';
import { OpponentCards } from '../components/table/OpponentCards';
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

  if (!user) return <div className="text-center py-16 text-muted">Hãy đăng nhập trước khi vào bàn.</div>;

  const toCall = state && me ? state.currentBet - me.bet : 0;
  const timerPct = state?.turnDeadline ? Math.max(0, Math.min(100, ((state.turnDeadline - now) / 30000) * 100)) : 0;

  const seatEntries = state
    ? Array.from({ length: state.seatsCount }, (_, i) => ({ seatIndex: i, player: state.players.find((x) => x.seatIndex === i) ?? null }))
    : [];
  const bottomPlayer = state && !state.isSpectator ? (me ?? null) : null;
  const topEntries = seatEntries.filter((e) => !bottomPlayer || !e.player || e.player.userId !== bottomPlayer.userId);

  const minRaise = state ? state.minRaiseTo : 0;
  const maxRaise = me ? me.bet + me.stack : 0;
  const canRaise = Boolean(me && state && minRaise < maxRaise);
  const showActionBar = Boolean(joined && state && me && !state.isSpectator && state.handInProgress);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 min-h-[calc(100dvh-3.5rem)] flex flex-col">
      <div className="flex items-center gap-4 mb-4 flex-wrap">
        <h1 className="text-xl font-bold">{state?.name ?? 'Bàn poker'}</h1>
        <span className="text-muted text-sm">Mã mời: <b className="tracking-widest">{code}</b></span>
        {state && <span className="text-muted text-sm">Blind {state.smallBlind}/{state.bigBlind} · Buy-in tối thiểu {fmt(state.minBuyIn)}</span>}
        {state && <span className="text-muted text-sm">{state.spectatorCount} người xem</span>}
        <div className="ml-auto flex gap-2">
          <button className="text-sm bg-inset border border-line hover:brightness-95 rounded-lg px-3 py-1.5"
            onClick={() => { leaveTable(); navigate('/phong-cho'); }}>Rời bàn</button>
        </div>
      </div>

      {error && <div className="bg-dangerbg border border-dangerline text-dangerink rounded-lg px-4 py-2 mb-4 text-sm">{error}</div>}

      {!joined && (
        <JoinPanel mode={mode} minBuyIn={state?.minBuyIn ?? null} buyIn={buyIn} onBuyInChange={setBuyIn} onJoin={doJoin} />
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
              {topEntries.map((e) => e.player ? (
                <SeatInfoBox key={e.player.userId} player={e.player} mine={false} turnDeadline={state.turnDeadline} timerPct={timerPct} />
              ) : (
                <div key={e.seatIndex} className="w-36 text-center text-muted text-xs border border-dashed border-line rounded-xl py-3 bg-surface">Ghế trống</div>
              ))}
            </div>
            <div className="rounded-3xl bg-felt border-[10px] border-rail shadow-[inset_0_0_80px_rgba(0,0,0,0.3)] px-3 py-3 flex flex-col gap-2" style={{ minHeight: 420 }}>
              {/* inside the top edge: hole cards of other players */}
              <div className="flex flex-wrap justify-center items-start gap-2 min-h-24">
                {topEntries.map((e) => e.player ? (
                  <OpponentCards key={e.player.userId} player={e.player} mine={false} />
                ) : (
                  <div key={e.seatIndex} className="w-36" />
                ))}
              </div>
              {/* center: board + pot */}
              <BoardArea state={state} />
              {/* inside the bottom edge: current player's hole cards */}
              {bottomPlayer && (
                <div className="flex justify-center">
                  <OpponentCards player={bottomPlayer} mine />
                </div>
              )}
            </div>
            {/* bottom edge, outside the felt: current player's info box */}
            {bottomPlayer && (
              <div className="flex justify-center mt-2">
                <SeatInfoBox player={bottomPlayer} mine turnDeadline={state.turnDeadline} timerPct={timerPct} />
              </div>
            )}
          </div>

          {/* host controls / waiting */}
          {!state.handInProgress && (
            <WaitingControls state={state} isHost={isHost} hasMe={Boolean(me)} onStart={startHand} onRebuy={rebuy} />
          )}

          {/* action bar: exactly 3 actions — Fold, Call/Check, Raise */}
          {showActionBar && me && (
            <ActionBar myTurn={myTurn} toCall={toCall} onAct={handleAct}
              onRaiseClick={() => { setRaiseTo(canRaise ? Math.max(minRaise, Math.min(raiseTo || minRaise, maxRaise)) : maxRaise); setShowRaise(true); }} />
          )}

          {/* raise modal */}
          {showRaise && myTurn && me && (
            <RaiseModal raiseTo={raiseTo} onRaiseToChange={setRaiseTo} minRaise={minRaise} maxRaise={maxRaise}
              canRaise={canRaise} onClose={() => setShowRaise(false)} onAct={handleAct} />
          )}
        </div>
      )}
    </div>
  );
}
