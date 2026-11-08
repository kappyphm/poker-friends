import { useState } from 'react';
import { fmt } from '../../lib/format';
import { errorMessageForCode } from '../../lib/errors';
import { handRankLabel } from './labels.js';
import type { TableState } from './types.js';

/**
 * Waiting state, presented inside the board zone of the redesigned
 * table: previous-hand result, the host's start button (or the wait
 * notice for everyone else) and the buy-more-chips row.
 */
export function WaitingControls({ state, isHost, hasMe, onStart, onRebuy }: {
  state: TableState;
  isHost: boolean;
  hasMe: boolean;
  onStart: () => void;
  onRebuy: (amount: number) => void;
}) {
  const [rebuyAmount, setRebuyAmount] = useState(500);
  return (
    <div className="w-full max-w-md mx-auto bg-surface border border-line rounded-3xl px-5 py-5 text-center space-y-3">
      {state.street === 'showdown' && state.lastResult && (
        <div className="border-b border-line pb-3">
          <div className="font-semibold mb-1">Kết quả ván #{state.lastResult.handNumber} — Pot {fmt(state.lastResult.totalPot)} chip</div>
          {state.lastResult.winners.map((w) => (
            <div key={w.userId} className="text-sm text-win">
              {w.name} thắng {fmt(w.amount)} chip{w.handRank ? ` với ${handRankLabel(w.handRank)}` : ''}
            </div>
          ))}
        </div>
      )}
      <div className="text-base font-semibold">Đang chờ bắt đầu ván</div>
      {isHost ? (
        <>
          <button
            disabled={!state.canStart.ok}
            className="w-full h-12 rounded-full bg-white text-black font-bold text-base hover:bg-neutral-200 disabled:bg-inset disabled:text-muted disabled:hover:bg-inset transition-colors"
            onClick={onStart}
          >Bắt đầu ván</button>
          {!state.canStart.ok && <div className="text-sm text-muted">{errorMessageForCode(state.canStart.code)}</div>}
        </>
      ) : (
        <div className="text-sm text-muted">Đang chờ chủ bàn bắt đầu ván…</div>
      )}
      {hasMe && (
        <div className="flex items-center justify-center gap-2 pt-1">
          <input
            type="number"
            className="bg-inset border border-line rounded-full px-4 py-2.5 w-32 text-center"
            value={rebuyAmount}
            onChange={(e) => setRebuyAmount(Number(e.target.value))}
          />
          <button
            className="h-11 rounded-full bg-[#2b2b2f] text-white px-5 font-semibold hover:bg-[#3a3a3f] transition-colors"
            onClick={() => onRebuy(rebuyAmount)}
          >Mua thêm chip</button>
        </div>
      )}
    </div>
  );
}
