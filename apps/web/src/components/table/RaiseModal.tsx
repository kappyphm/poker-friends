import { fmt } from '../../lib/format';

/** Raise dialog: big amount input, synced slider, All-in / Raise actions. */
export function RaiseModal({ raiseTo, onRaiseToChange, minRaise, maxRaise, canRaise, onClose, onAct }: {
  raiseTo: number;
  onRaiseToChange: (n: number) => void;
  minRaise: number;
  maxRaise: number;
  canRaise: boolean;
  onClose: () => void;
  onAct: (action: string, amount?: number) => void;
}) {
  const raiseValid = canRaise && raiseTo >= minRaise && raiseTo <= maxRaise;
  return (
  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center px-4" onClick={onClose}>
    <div className="bg-surface border border-line rounded-3xl shadow-2xl w-[min(430px,94vw)] p-6" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold">Raise tới</h2>
        <button type="button" aria-label="Đóng" className="w-8 h-8 rounded-full bg-inset border border-line flex items-center justify-center hover:brightness-95" onClick={onClose}>×</button>
      </div>
      <input
        type="number"
        className="w-full bg-inset border border-line rounded-2xl px-4 py-4 text-5xl font-bold text-center"
        value={raiseTo}
        min={minRaise}
        max={maxRaise}
        onChange={(e) => onRaiseToChange(Number(e.target.value))}
      />
      <input
        type="range"
        className="w-full mt-5"
        min={Math.min(minRaise, maxRaise)}
        max={maxRaise}
        value={Math.max(Math.min(minRaise, maxRaise), Math.min(raiseTo, maxRaise))}
        onChange={(e) => onRaiseToChange(Number(e.target.value))}
      />
      <div className="text-center text-sm text-muted mt-2">
        Tối thiểu {fmt(minRaise)} chip · Tối đa {fmt(maxRaise)} chip
      </div>
      {!canRaise && (
        <div className="text-center text-sm text-muted mt-2">Số chip còn lại không đủ để raise — bạn chỉ có thể All-in.</div>
      )}
      <div className="flex gap-3 mt-6">
        <button
          className="flex-1 bg-lav text-lavink hover:brightness-95 rounded-2xl px-4 py-3.5 text-lg font-bold shadow-sm"
          onClick={() => onAct('allin')}
        >All-in</button>
        <button
          disabled={!raiseValid}
          className="flex-1 bg-raise text-raiseink hover:brightness-95 disabled:opacity-40 disabled:hover:brightness-100 rounded-2xl px-4 py-3.5 text-lg font-bold shadow-sm"
          onClick={() => onAct('raise', raiseTo)}
        >Raise</button>
      </div>
    </div>
  </div>
  );
}
