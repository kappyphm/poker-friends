import { fmt } from '../../lib/format';

/** Pre-join panel: buy-in form for players, or spectator entry. */
export function JoinPanel({ mode, minBuyIn, buyIn, onBuyInChange, onJoin }: {
  mode: string | null;
  minBuyIn: number | null;
  buyIn: number;
  onBuyInChange: (n: number) => void;
  onJoin: (asSpectator: boolean) => void;
}) {
  return (
  <div className="bg-surface border border-line rounded-2xl p-6 max-w-md mx-auto text-center">
    {mode === 'spectator' ? (
      <>
        <p className="mb-4 text-muted">Xem bàn này với tư cách khán giả. Bạn sẽ không thấy bài tẩy của bất kỳ ai.</p>
        <button className="bg-lav text-lavink hover:brightness-95 rounded-lg px-6 py-2.5 font-semibold" onClick={() => onJoin(true)}>Vào xem</button>
      </>
    ) : (
      <>
        <p className="mb-1 font-semibold">Mua chip vào bàn</p>
        <p className="text-sm text-muted mb-4">Nhập số chip mang vào (tối thiểu {minBuyIn !== null ? fmt(minBuyIn) : '—'}). Chip chỉ dùng trong bàn này, rời bàn sẽ được ghi vào lịch sử.</p>
        <input type="number" className="w-full bg-inset border border-line rounded-lg px-3 py-2 mb-3 text-center text-lg"
          value={buyIn} onChange={(e) => onBuyInChange(Number(e.target.value))} />
        <button className="w-full bg-accent text-accentink hover:brightness-95 rounded-lg py-2.5 font-semibold" onClick={() => onJoin(false)}>Mua chip & ngồi vào bàn</button>
        <button className="w-full mt-2 text-sm text-muted hover:text-ink" onClick={() => onJoin(true)}>Chỉ xem, không chơi</button>
      </>
    )}
  </div>
  );
}
