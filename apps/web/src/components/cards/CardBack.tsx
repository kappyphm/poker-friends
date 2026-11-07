import { PlayingCard } from './PlayingCard';

/** Face-down card with the shared back design, sized like PlayingCard. */
export function CardBack({ small, large }: { small?: boolean; large?: boolean }) {
  return <PlayingCard faceDown small={small} large={large} />;
}
