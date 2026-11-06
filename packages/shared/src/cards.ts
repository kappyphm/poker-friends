export type Suit = 's' | 'h' | 'd' | 'c';
export interface Card {
  rank: number; // 2..14 (11=J,12=Q,13=K,14=A)
  suit: Suit;
}

const RANK_CHARS: Record<number, string> = {
  2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9',
  10: 'T', 11: 'J', 12: 'Q', 13: 'K', 14: 'A',
};
const CHAR_RANKS: Record<string, number> = Object.fromEntries(
  Object.entries(RANK_CHARS).map(([k, v]) => [v, Number(k)]),
);

export function cardToString(c: Card): string {
  return `${RANK_CHARS[c.rank]}${c.suit}`;
}

export function parseCard(s: string): Card {
  const rank = CHAR_RANKS[s[0].toUpperCase()];
  const suit = s[1].toLowerCase() as Suit;
  if (!rank || !['s', 'h', 'd', 'c'].includes(suit)) throw new Error(`Invalid card: ${s}`);
  return { rank, suit };
}

export function parseCards(s: string): Card[] {
  return s.trim().split(/\s+/).map(parseCard);
}

export function createDeck(): Card[] {
  const suits: Suit[] = ['s', 'h', 'd', 'c'];
  const deck: Card[] = [];
  for (const suit of suits) for (let r = 2; r <= 14; r++) deck.push({ rank: r, suit });
  return deck;
}

/** Deterministic PRNG (mulberry32) so shuffles are reproducible in tests. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffleDeck(deck: Card[], rng: () => number): Card[] {
  const d = [...deck];
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}
