import { fmt } from '../../lib/format';
import { ACTION_VI } from './labels.js';
import type { PlayerState } from './types.js';

export function SeatInfoBox({ player: p, mine, turnDeadline, timerPct }: {
  player: PlayerState;
  mine: boolean;
  turnDeadline: number | null;
  timerPct: number;
}) {
  return (
  <div className={`${mine ? 'w-52' : 'w-36'} rounded-xl px-2 py-2 text-center bg-surface border ${p.isTurn ? 'border-accent shadow-[0_0_16px_rgba(127,199,155,0.55)]' : 'border-line'} ${p.folded ? 'opacity-50' : ''}`}>
    <div className="flex items-center justify-center gap-1.5">
      <span title={p.connected ? 'Đang trực tuyến' : 'Mất kết nối'} className={`w-2.5 h-2.5 rounded-full shrink-0 ${p.connected ? 'bg-emerald-400' : 'bg-red-400'}`} />
      {p.avatarUrl ? <img src={p.avatarUrl} alt="" className="w-6 h-6 rounded-full" /> : <span className="w-6 h-6 rounded-full bg-lav text-lavink inline-flex items-center justify-center text-xs">{p.name[0]}</span>}
      <span className={`${mine ? 'text-base' : 'text-sm'} font-semibold truncate max-w-24`}>{p.name}</span>
      {p.isDealer && <span className="text-[10px] bg-ink text-bg rounded-full px-1.5 font-bold">D</span>}
      {p.sittingOut && <span className="text-[10px] bg-inset text-muted border border-line rounded px-1">Vắng</span>}
      {p.allIn && <span className="text-[10px] bg-fold text-foldink rounded px-1">All-in</span>}
    </div>
    <div className="text-xs text-muted">{fmt(p.stack)} chip</div>
    {p.isTurn && turnDeadline && (
      <div className="h-1 bg-inset rounded mt-1 overflow-hidden">
        <div className="h-full bg-accent transition-all" style={{ width: `${timerPct}%` }} />
      </div>
    )}
    {p.handName && <div className="text-[11px] text-win mt-0.5">{p.handName}</div>}
    {p.lastAction && p.inHand && <div className="text-[11px] text-muted">{ACTION_VI[p.lastAction] ?? p.lastAction}</div>}
  </div>
  );
}
