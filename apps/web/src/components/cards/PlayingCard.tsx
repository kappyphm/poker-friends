import { cardParts } from '../../lib/cards';

const SIZES = {
  mini: { box: 'w-8 h-11 text-[11px] rounded-md', suit: 'text-xs', pad: 'p-1' },
  small: { box: 'w-11 h-[3.75rem] text-base rounded-lg', suit: 'text-base', pad: 'p-1.5' },
  normal: { box: 'w-14 h-[4.75rem] text-xl rounded-lg', suit: 'text-xl', pad: 'p-1.5' },
  large: { box: 'w-16 h-[5.5rem] text-2xl rounded-xl', suit: 'text-2xl', pad: 'p-2' },
  board: { box: 'w-[4.25rem] h-24 text-[1.7rem] rounded-xl sm:w-24 sm:h-[8.5rem] sm:text-4xl', suit: 'text-[1.7rem] sm:text-4xl', pad: 'p-2 sm:p-2.5' },
  hero: { box: 'w-[5.5rem] h-[7.5rem] text-4xl rounded-2xl sm:w-28 sm:h-40 sm:text-5xl', suit: 'text-4xl sm:text-5xl', pad: 'p-2.5 sm:p-3' },
} as const;

type SizeName = keyof typeof SIZES;

export function PlayingCard({ card, small, large, board, hero, mini, faceDown }: {
  card?: string;
  small?: boolean;
  large?: boolean;
  board?: boolean;
  hero?: boolean;
  mini?: boolean;
  faceDown?: boolean;
}) {
  const sizeName: SizeName = hero ? 'hero' : board ? 'board' : large ? 'large' : small ? 'small' : mini ? 'mini' : 'normal';
  const size = SIZES[sizeName];
  if (faceDown || !card) {
    return (
      <div className={`${size.box} bg-cardback shadow-md shrink-0 ${size.pad}`}>
        <div
          className="w-full h-full rounded-[inherit]"
          style={{ background: 'repeating-linear-gradient(45deg, var(--cardback-line) 0 3px, var(--cardback) 3px 11px)' }}
        />
      </div>
    );
  }
  const { rank, suit, red } = cardParts(card);
  return (
    <div className={`${size.box} bg-white shadow-md shrink-0 font-bold leading-none ${red ? 'text-[#e03131]' : 'text-neutral-900'}`}>
      <div className={`flex flex-col items-start ${size.pad}`}>
        <span>{rank}</span>
        <span className={size.suit}>{suit}</span>
      </div>
    </div>
  );
}
