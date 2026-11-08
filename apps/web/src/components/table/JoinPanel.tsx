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
  <div className="bg-surface border border-line rounded-3xl p-6 max-w-md mx-auto text-center w-full">
    {mode === 'spectator' ? (
      <>
        <p className="mb-4 text-muted">Xem bàn này với tư cách khán giả. Bạn sẽ không thấy bài tẩy của bất kỳ ai.</p>
        <button className="h-12 rounded-full bg-[#2b2b2f] text-white hover:bg-[#3a3a3f] px-8 font-semibold transition-colors" onClick={() => onJoin(true)}>Vào xem</button>
      </>
    ) : (
      <>
        <p className="mb-1 font-semibold">Mua chip vào bàn</p>
        <p className="text-sm text-muted mb-4">Nhập số chip mang vào (tối thiểu {minBuyIn !== null ? fmt(minBuyIn) : '—'}). Chip chỉ dùng trong bàn này, rời bàn sẽ được ghi vào lịch sử.</p>
        <input type="number" className="w-full bg-inset border border-line rounded-2xl px-3 py-3 mb-3 text-center text-lg"
          value={buyIn} onChange={(e) => onBuyInChange(Number(e.target.value))} />
        <button className="w-full h-12 rounded-full bg-white text-black hover:bg-neutral-200 font-bold transition-colors" onClick={() => onJoin(false)}>Mua chip & ngồi vào bàn</button>
        <button className="w-full mt-2 h-11 rounded-full text-sm text-muted hover:text-ink" onClick={() => onJoin(true)}>Chỉ xem, không chơi</button>
      </>
    )}
  </div>
  );
}
