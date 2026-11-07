import { cardParts } from '../../lib/cards';

const SIZES = {
  small: { box: 'w-11 h-[3.75rem] text-base', suit: 'text-lg', inner: 'w-7 h-10' },
  normal: { box: 'w-14 h-[4.75rem] text-xl', suit: 'text-2xl', inner: 'w-9 h-12' },
  large: { box: 'w-16 h-[5.5rem] text-2xl', suit: 'text-3xl', inner: 'w-10 h-14' },
} as const;

export function PlayingCard({ card, small, large, faceDown }: { card?: string; small?: boolean; large?: boolean; faceDown?: boolean }) {
  const size = large ? SIZES.large : small ? SIZES.small : SIZES.normal;
  if (faceDown || !card) {
    return (
      <div className={`${size.box} rounded-md bg-cardback border border-cardbackline shadow flex items-center justify-center`}>
        <div className={`${size.inner} rounded-sm border border-cardbackline/70 bg-[repeating-linear-gradient(45deg,var(--cardback-line)_0_4px,var(--cardback)_4px_8px)]`} />
      </div>
    );
  }
  const { rank, suit, red } = cardParts(card);
  return (
    <div className={`${size.box} rounded-md bg-white shadow flex flex-col items-center justify-center font-bold leading-none ${red ? 'text-[#d6455c]' : 'text-neutral-800'}`}>
      <span>{rank}</span>
      <span className={size.suit}>{suit}</span>
    </div>
  );
}
