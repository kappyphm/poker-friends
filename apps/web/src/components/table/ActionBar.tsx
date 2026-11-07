import { fmt } from '../../lib/format';

/** Fixed bottom action bar: exactly 3 actions — Fold, Call/Check, Raise. */
export function ActionBar({ myTurn, toCall, onAct, onRaiseClick }: {
  myTurn: boolean;
  toCall: number;
  onAct: (action: string) => void;
  onRaiseClick: () => void;
}) {
  return (
  <div className="fixed bottom-0 left-0 right-0 bg-surface/90 border-t border-line backdrop-blur z-40">
    <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3 flex-wrap justify-center">
      <span className="text-sm text-muted mr-1">
        {myTurn
          ? <>Tới lượt bạn · cần theo: <b className="text-ink">{fmt(toCall)}</b></>
          : 'Chưa tới lượt bạn'}
      </span>
      <button
        disabled={!myTurn}
        className="bg-fold text-foldink hover:brightness-95 disabled:opacity-40 disabled:hover:brightness-100 rounded-2xl px-7 py-3 text-lg font-bold shadow-sm"
        onClick={() => onAct('fold')}
      >Úp bỏ (Fold)</button>
      <button
        disabled={!myTurn}
        className="bg-call text-callink hover:brightness-95 disabled:opacity-40 disabled:hover:brightness-100 rounded-2xl px-7 py-3 text-lg font-bold shadow-sm"
        onClick={() => onAct(toCall === 0 ? 'check' : 'call')}
      >{toCall === 0 ? 'Check' : `Call ${fmt(toCall)}`}</button>
      <button
        disabled={!myTurn}
        className="bg-raise text-raiseink hover:brightness-95 disabled:opacity-40 disabled:hover:brightness-100 rounded-2xl px-7 py-3 text-lg font-bold shadow-sm"
        onClick={onRaiseClick}
      >Raise</button>
    </div>
  </div>
  );
}
