import { fmt } from '../../lib/format';
import { PlayingCard } from '../cards/PlayingCard';
import { CardBack } from '../cards/CardBack';
import { ACTION_VI, handRankLabel } from './labels.js';
import type { PlayerState } from './types.js';

/**
 * Bottom zone of the redesigned table: the viewer's hole cards, large, at
 * the left and their own info card at the right (hand-rank label, avatar,
 * stack) — mirroring the reference layout. Spectators get an info card
 * instead of cards; they never receive hole cards.
 */
export function HeroZone({ player: p, spectator, handInProgress, timerPct }: {
  player: PlayerState | null;
  spectator: boolean;
  handInProgress: boolean;
  timerPct: number;
}) {
  if (spectator || !p) {
    return (
      <div className="flex justify-center pb-1">
        <div className="bg-surface border border-line rounded-3xl px-6 py-4 text-center">
          <div className="text-sm font-semibold">Bạn đang xem bàn này</div>
          <div className="text-xs text-muted mt-0.5">Bài tẩy của người chơi chỉ hiện khi lật bài ở showdown.</div>
        </div>
      </div>
    );
  }
  const rank = handRankLabel(p.handRank);
  // The server sends an empty array (not null) before cards are dealt.
  const hasCards = Boolean(p.cards && p.cards.length > 0);
  return (
    <div className="flex items-end justify-between gap-3">
      <div className="flex flex-col items-start">
        {p.bet > 0 && (
          <div className="mb-2 min-w-8 h-8 px-2 rounded-full bg-inset border border-line flex items-center justify-center text-xs font-bold text-amber-300">
            {fmt(p.bet)}
          </div>
        )}
        <div className={`flex ${p.folded ? 'opacity-45' : ''}`}>
          {hasCards ? (
            <>
              <PlayingCard card={p.cards![0]} hero />
              {p.cards![1] && <div className="-ml-7 sm:-ml-9"><PlayingCard card={p.cards![1]} hero /></div>}
            </>
          ) : (
            <>
              <CardBack hero />
              <div className="-ml-7 sm:-ml-9"><CardBack hero /></div>
            </>
          )}
        </div>
        {handInProgress && !p.inHand && <div className="text-[11px] text-muted mt-1.5">Chờ ván sau</div>}
      </div>

      <div className="bg-surface border border-line rounded-3xl px-4 py-3 w-36 sm:w-44 flex flex-col items-center text-center shrink-0">
        <div className="text-xs text-muted h-4">{rank ?? p.name}</div>
        <div className="relative my-1.5">
          {p.avatarUrl
            ? <img src={p.avatarUrl} alt="" className="w-12 h-12 sm:w-14 sm:h-14 rounded-full object-cover" />
            : <span className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-inset border border-line inline-flex items-center justify-center text-lg font-semibold">{p.name[0]}</span>}
          <span
            title={p.connected ? 'Đang trực tuyến' : 'Mất kết nối'}
            className={`absolute top-0 right-0 w-2.5 h-2.5 rounded-full border border-black ${p.connected ? 'bg-emerald-400' : 'bg-red-400'}`}
          />
          {p.isDealer && (
            <span className="absolute -bottom-0.5 -right-1 w-5 h-5 rounded-full bg-white text-black text-[11px] font-bold flex items-center justify-center shadow">D</span>
          )}
        </div>
        {rank && <div className="text-xs truncate max-w-full">{p.name}</div>}
        <div className="text-lg font-bold leading-tight">{fmt(p.stack)}</div>
        {p.isTurn && (
          <div className="w-full h-1 bg-inset rounded-full mt-1.5 overflow-hidden">
            <div className="h-full bg-white transition-all" style={{ width: `${timerPct}%` }} />
          </div>
        )}
        {p.sittingOut && <div className="text-[10px] text-muted mt-1">Vắng</div>}
        {p.allIn && <div className="text-[10px] text-lose mt-1">All-in</div>}
        {p.lastAction && p.inHand && (
          <div className="text-[10px] text-muted mt-1">{ACTION_VI[p.lastAction] ?? p.lastAction}</div>
        )}
      </div>
    </div>
  );
}
