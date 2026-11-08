import { PlayingCard } from './PlayingCard';

/** Face-down card with the shared back design, sized like PlayingCard. */
export function CardBack({ small, large, board, hero, mini }: {
  small?: boolean;
  large?: boolean;
  board?: boolean;
  hero?: boolean;
  mini?: boolean;
}) {
  return <PlayingCard faceDown small={small} large={large} board={board} hero={hero} mini={mini} />;
}
