import { useState } from 'react';
import { fmt } from '../../lib/format';
import type { TableState } from './types.js';

/** Between-hands area: last hand result, host start button, rebuy row. */
export function WaitingControls({ state, isHost, hasMe, onStart, onRebuy }: {
  state: TableState;
  isHost: boolean;
  hasMe: boolean;
  onStart: () => void;
  onRebuy: (amount: number) => void;
}) {
  const [rebuyAmount, setRebuyAmount] = useState(500);
  const me = hasMe;
  return (
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
          onClick={onStart}
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
          onClick={() => onRebuy(rebuyAmount)}>Mua thêm chip</button>
      </div>
    )}
  </div>
  );
}
