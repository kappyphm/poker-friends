import { cardParts } from '../lib';

export function PlayingCard({ card, small, faceDown }: { card?: string; small?: boolean; faceDown?: boolean }) {
  const size = small ? 'w-9 h-12 text-sm' : 'w-12 h-16 text-lg';
  if (faceDown || !card) {
    return (
      <div className={`${size} rounded-md bg-[#1e3a5f] border border-[#3b6ea5] shadow flex items-center justify-center`}>
        <div className="w-6 h-8 rounded-sm border border-[#3b6ea5]/70 bg-[repeating-linear-gradient(45deg,#24466e_0_4px,#1e3a5f_4px_8px)]" />
      </div>
    );
  }
  const { rank, suit, red } = cardParts(card);
  return (
    <div className={`${size} rounded-md bg-neutral-100 shadow flex flex-col items-center justify-center font-bold leading-none ${red ? 'text-red-600' : 'text-neutral-900'}`}>
      <span>{rank}</span>
      <span className={small ? 'text-base' : 'text-xl'}>{suit}</span>
    </div>
  );
}

/** Chip denominations: ONLY blue / red / white / black. */
const DENOMS: { value: number; bg: string; ring: string; text: string }[] = [
  { value: 1000, bg: '#17181c', ring: '#f5f5f5', text: '#f5f5f5' }, // black
  { value: 500, bg: '#b91c1c', ring: '#f5f5f5', text: '#f5f5f5' }, // red
  { value: 100, bg: '#1d4ed8', ring: '#f5f5f5', text: '#f5f5f5' }, // blue
  { value: 25, bg: '#f5f5f4', ring: '#17181c', text: '#17181c' }, // white
];

export function chipBreakdown(amount: number): { value: number; count: number; bg: string; ring: string; text: string }[] {
  const out: { value: number; count: number; bg: string; ring: string; text: string }[] = [];
  let rest = amount;
  for (const d of DENOMS) {
    const count = Math.floor(rest / d.value);
    if (count > 0) { out.push({ ...d, count }); rest -= count * d.value; }
  }
  if (rest > 0 && out.length === 0) out.push({ ...DENOMS[3], count: 1 });
  return out;
}

export function ChipStack({ amount }: { amount: number }) {
  if (amount <= 0) return null;
  const parts = chipBreakdown(amount);
  return (
    <div className="flex items-end gap-1" title={`${amount} chip`}>
      {parts.slice(0, 3).map((p) => (
        <div key={p.value} className="flex flex-col-reverse items-center">
          {Array.from({ length: Math.min(p.count, 4) }).map((_, i) => (
            <div
              key={i}
              className="w-6 h-2.5 rounded-full border-2 border-dashed -mt-0.5"
              style={{ backgroundColor: p.bg, borderColor: p.ring }}
            />
          ))}
          <span className="text-[10px] mt-0.5" style={{ color: p.text === '#17181c' ? '#d6d3d1' : p.text }}>{p.value}</span>
        </div>
      ))}
    </div>
  );
}

export function ChipDot({ amount }: { amount: number }) {
  const parts = chipBreakdown(amount);
  const top = parts[0];
  if (!top) return null;
  return (
    <span
      className="inline-flex items-center justify-center w-7 h-7 rounded-full border-2 border-dashed text-[10px] font-bold"
      style={{ backgroundColor: top.bg, borderColor: top.ring, color: top.text }}
    >
      {amount >= 1000 ? `${Math.floor(amount / 100) / 10}k` : amount}
    </span>
  );
}
