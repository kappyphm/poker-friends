import { fmt } from '../../lib/format';
import { PlayingCard } from '../cards/PlayingCard';
import { ACTION_VI, handRankLabel } from './labels.js';
import type { PlayerState } from './types.js';

/**
 * One opponent in the top row of the redesigned table: round avatar with
 * dealer badge, name + stack below, bet pill under a player who has bet.
 * Revealed showdown cards appear as mini cards under the chip.
 */
export function OpponentChip({ player: p, compact, timerPct }: {
  player: PlayerState;
  compact: boolean;
  timerPct: number;
}) {
  const avatarSize = compact ? 'w-10 h-10 text-sm' : 'w-12 h-12 text-base sm:w-14 sm:h-14 sm:text-lg';
  return (
    <div className={`flex flex-col items-center text-center ${compact ? 'w-16' : 'w-[4.5rem] sm:w-20'} ${p.folded ? 'opacity-45' : ''}`}>
      <div className="relative">
        {p.avatarUrl
          ? <img src={p.avatarUrl} alt="" className={`${avatarSize} rounded-full object-cover ${p.isTurn ? 'ring-2 ring-white shadow-[0_0_14px_rgba(255,255,255,0.45)]' : ''}`} />
          : <span className={`${avatarSize} rounded-full bg-inset border border-line inline-flex items-center justify-center font-semibold ${p.isTurn ? 'ring-2 ring-white shadow-[0_0_14px_rgba(255,255,255,0.45)]' : ''}`}>{p.name[0]}</span>}
        <span
          title={p.connected ? 'Đang trực tuyến' : 'Mất kết nối'}
          className={`absolute top-0 right-0 w-2.5 h-2.5 rounded-full border border-black ${p.connected ? 'bg-emerald-400' : 'bg-red-400'}`}
        />
        {p.isDealer && (
          <span className="absolute -bottom-0.5 -right-1 w-5 h-5 rounded-full bg-white text-black text-[11px] font-bold flex items-center justify-center shadow">D</span>
        )}
      </div>
      <div className="mt-1 w-full truncate text-xs font-medium leading-tight">{p.name}</div>
      <div className="text-[11px] text-muted leading-tight">{fmt(p.stack)}</div>
      {p.isTurn && (
        <div className="w-10 h-1 bg-inset rounded-full mt-1 overflow-hidden">
          <div className="h-full bg-white transition-all" style={{ width: `${timerPct}%` }} />
        </div>
      )}
      {p.sittingOut && <div className="text-[10px] text-muted mt-0.5">Vắng</div>}
      {p.allIn && <div className="text-[10px] text-lose mt-0.5">All-in</div>}
      {p.handRank && <div className="text-[10px] text-win mt-0.5">{handRankLabel(p.handRank)}</div>}
      {p.lastAction && p.inHand && !p.handRank && (
        <div className="text-[10px] text-muted mt-0.5">{ACTION_VI[p.lastAction] ?? p.lastAction}</div>
      )}
      {p.cards && (
        <div className="flex gap-1 mt-1.5">
          {p.cards.map((c, j) => <PlayingCard key={j} card={c} mini />)}
        </div>
      )}
      {p.bet > 0 && (
        <div className="mt-1.5 min-w-7 h-7 px-1.5 rounded-full bg-inset border border-line flex items-center justify-center text-[11px] font-bold text-amber-300">
          {fmt(p.bet)}
        </div>
      )}
    </div>
  );
}

/** Placeholder for an unoccupied seat in the opponents row. */
export function EmptySeatChip({ compact }: { compact: boolean }) {
  const avatarSize = compact ? 'w-10 h-10' : 'w-12 h-12 sm:w-14 sm:h-14';
  return (
    <div className={`flex flex-col items-center text-center ${compact ? 'w-16' : 'w-[4.5rem] sm:w-20'}`}>
      <div className={`${avatarSize} rounded-full border border-dashed border-line`} />
      <div className="mt-1 text-[11px] text-muted">Ghế trống</div>
    </div>
  );
}
