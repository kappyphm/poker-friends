import { fmt } from '../../lib/format';

/**
 * In-flow action row of the redesigned table: dark pill buttons —
 * Fold, Check / "Call X" (dynamic), Raise (opens the raise modal) —
 * plus the round "↑" button from the reference layout, which also
 * opens the raise modal.
 */
export function ActionBar({ myTurn, toCall, onAct, onRaiseClick }: {
  myTurn: boolean;
  toCall: number;
  onAct: (action: string) => void;
  onRaiseClick: () => void;
}) {
  const pill = 'flex-1 min-w-0 h-12 rounded-full bg-[#2b2b2f] text-white text-base font-semibold shadow hover:bg-[#3a3a3f] disabled:opacity-40 disabled:hover:bg-[#2b2b2f] transition-colors';
  return (
    <div className="py-1">
      <div className="flex items-center gap-2 sm:gap-3 max-w-xl mx-auto">
        <button disabled={!myTurn} className={pill} onClick={() => onAct('fold')}>Úp bỏ</button>
        <button
          disabled={!myTurn}
          className={pill}
          onClick={() => onAct(toCall === 0 ? 'check' : 'call')}
        >{toCall === 0 ? 'Check' : `Call ${fmt(toCall)}`}</button>
        <button disabled={!myTurn} className={pill} onClick={onRaiseClick}>Raise</button>
        <button
          disabled={!myTurn}
          aria-label="Mở bảng raise"
          className="w-12 h-12 shrink-0 rounded-full bg-[#2b2b2f] text-white text-lg shadow hover:bg-[#3a3a3f] disabled:opacity-40 disabled:hover:bg-[#2b2b2f] transition-colors"
          onClick={onRaiseClick}
        >↑</button>
      </div>
      <div className="text-center text-xs text-muted mt-1.5 h-4">
        {myTurn ? <>Tới lượt bạn{toCall > 0 ? <> · cần theo <b className="text-ink">{fmt(toCall)}</b></> : ''}</> : 'Đang chờ đối thủ…'}
      </div>
    </div>
  );
}
