import { fmt } from '../../lib/format';
import { PlayingCard } from '../cards/PlayingCard';
import { STREET_VI } from './labels.js';
import type { TableState } from './types.js';

/** Center of the felt: community cards, street name, pot and hand number. */
export function BoardArea({ state }: { state: TableState }) {
  return (
  <div className="flex-1 flex flex-col items-center justify-center text-center py-2 text-feltink">
    <div className="flex gap-1.5 justify-center mb-2">
      {[0, 1, 2, 3, 4].map((i) => state.board[i]
        ? <PlayingCard key={i} card={state.board[i]} />
        : <div key={i} className="w-14 h-[4.75rem] rounded-md border-2 border-dashed" style={{ borderColor: 'var(--felt-muted)', background: 'rgba(0,0,0,0.08)' }} />)}
    </div>
    <div className="text-sm text-feltmuted">{state.street ? STREET_VI[state.street] : 'Đang chờ bắt đầu'}</div>
    <div className="font-bold text-lg">Pot: {fmt(state.pot)} chip</div>
    {state.handNumber > 0 && <div className="text-xs text-feltmuted">Ván #{state.handNumber}</div>}
  </div>
  );
}
