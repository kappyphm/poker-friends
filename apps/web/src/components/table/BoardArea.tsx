import { fmt } from '../../lib/format';
import { PlayingCard } from '../cards/PlayingCard';
import { STREET_VI } from './labels.js';
import type { TableState } from './types.js';

/**
 * Center zone of the redesigned table: the board as large overlapping
 * cards (undealt slots shown as striped face-down cards, like the
 * reference), street/hand info at the left and the pot at the bottom
 * right, just below the board.
 */
export function BoardArea({ state }: { state: TableState }) {
  return (
    <div className="flex flex-col items-center justify-center px-1">
      <div className="flex justify-center">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className={i > 0 ? '-ml-6 sm:-ml-10' : ''}>
            {state.board[i]
              ? <PlayingCard card={state.board[i]} board />
              : <PlayingCard board faceDown />}
          </div>
        ))}
      </div>
      <div className="w-full max-w-md flex items-end justify-between mt-2.5 px-0.5">
        <div className="text-xs text-muted">
          {state.street ? STREET_VI[state.street] : ''}
          {state.handNumber > 0 && <span> · Ván #{state.handNumber}</span>}
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-xs text-muted">Pot</span>
          <span className="text-xl font-bold leading-none">{fmt(state.pot)}</span>
        </div>
      </div>
    </div>
  );
}
