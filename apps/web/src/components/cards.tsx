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
