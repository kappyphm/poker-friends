import { fmt } from '../../lib/format';

/** Raise dialog in the redesigned dark language: big amount input, synced slider, All-in / Raise pill actions. Same behavior as before. */
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
  <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center sm:px-4" onClick={onClose}>
    <div className="bg-surface border border-line rounded-t-3xl sm:rounded-3xl shadow-2xl w-full sm:w-[min(430px,94vw)] p-6" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold">Raise tới</h2>
        <button type="button" aria-label="Đóng" className="w-11 h-11 rounded-full bg-inset border border-line flex items-center justify-center text-xl hover:bg-[#2b2b2f]" onClick={onClose}>×</button>
      </div>
      <input
        type="number"
        inputMode="numeric"
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
          className="flex-1 h-12 rounded-full bg-[#2b2b2f] text-white hover:bg-[#3a3a3f] px-4 text-lg font-bold transition-colors"
          onClick={() => onAct('allin')}
        >All-in</button>
        <button
          disabled={!raiseValid}
          className="flex-1 h-12 rounded-full bg-white text-black hover:bg-neutral-200 disabled:opacity-40 disabled:hover:bg-white px-4 text-lg font-bold transition-colors"
          onClick={() => onAct('raise', raiseTo)}
        >Raise</button>
      </div>
    </div>
  </div>
  );
}
