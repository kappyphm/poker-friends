import { fmt } from '../../lib/format';
import { PlayingCard } from '../cards/PlayingCard';
import { CardBack } from '../cards/CardBack';
import type { PlayerState } from './types.js';

/** In-felt hole-card cluster for one player (bet pill + cards at their edge). */
export function OpponentCards({ player: p, mine }: { player: PlayerState; mine: boolean }) {
  return (
  <div className={`${mine ? 'w-52' : 'w-36'} flex flex-col items-center`}>
    {mine && p.bet > 0 && (
      <div className="mb-1 text-xs text-white bg-black/45 rounded-full px-2 py-0.5">Cược: {fmt(p.bet)} chip</div>
    )}
    {(p.cards || p.cardsHidden) && (
      <div className={`flex gap-1 justify-center rounded-lg p-1 border ${p.isTurn ? 'border-accent shadow-[0_0_16px_rgba(127,199,155,0.55)]' : 'border-transparent'} ${p.folded ? 'opacity-50' : ''}`}>
        {p.cards
          ? p.cards.map((c, j) => mine ? <PlayingCard key={j} card={c} large /> : <PlayingCard key={j} card={c} small />)
          : [<CardBack key="a" small />, <CardBack key="b" small />]}
      </div>
    )}
    {!mine && p.bet > 0 && (
      <div className="mt-1 text-xs text-white bg-black/45 rounded-full px-2 py-0.5">Cược: {fmt(p.bet)} chip</div>
    )}
  </div>
  );
}
