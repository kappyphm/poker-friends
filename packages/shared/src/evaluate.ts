import type { Card } from './cards.js';

export interface HandValue {
  category: number; // 0 high card .. 8 straight flush
  categoryName: string;
  categoryNameVi: string;
  tiebreak: number[];
  score: number;
  bestFive: Card[];
}

const NAMES: [string, string][] = [
  ['High Card', 'Bài cao'],
  ['Pair', 'Một đôi'],
  ['Two Pair', 'Hai đôi'],
  ['Three of a Kind', 'Bộ ba (sám)'],
  ['Straight', 'Sảnh'],
  ['Flush', 'Thùng'],
  ['Full House', 'Cù lũ'],
  ['Four of a Kind', 'Tứ quý'],
  ['Straight Flush', 'Thùng phá sảnh'],
];

function scoreOf(category: number, tiebreak: number[]): number {
  let s = category;
  for (let i = 0; i < 5; i++) s = s * 15 + (tiebreak[i] ?? 0);
  return s;
}

export function evaluate5(cards: Card[]): HandValue {
  if (cards.length !== 5) throw new Error('evaluate5 needs exactly 5 cards');
  const ranksDesc = cards.map((c) => c.rank).sort((a, b) => b - a);
  const flush = cards.every((c) => c.suit === cards[0].suit);
  const unique = [...new Set(ranksDesc)].sort((a, b) => b - a);
  let straightHigh = 0;
  if (unique.length === 5) {
    if (unique[0] - unique[4] === 4) straightHigh = unique[0];
    else if (unique[0] === 14 && unique[1] === 5) straightHigh = 5; // wheel A-2-3-4-5
  }
  // groups by rank: [rank, count] sorted by count desc, then rank desc
  const counts = new Map<number, number>();
  for (const r of ranksDesc) counts.set(r, (counts.get(r) ?? 0) + 1);
  const groups = [...counts.entries()]
    .map(([rank, count]) => ({ rank, count }))
    .sort((a, b) => b.count - a.count || b.rank - a.rank);
  const kickers = (exclude: number[]) =>
    ranksDesc.filter((r) => !exclude.includes(r));

  let category = 0;
  let tiebreak: number[] = ranksDesc;
  if (straightHigh && flush) {
    category = 8; tiebreak = [straightHigh];
  } else if (groups[0].count === 4) {
    category = 7; tiebreak = [groups[0].rank, kickers([groups[0].rank])[0]];
  } else if (groups[0].count === 3 && groups[1]?.count === 2) {
    category = 6; tiebreak = [groups[0].rank, groups[1].rank];
  } else if (flush) {
    category = 5; tiebreak = ranksDesc;
  } else if (straightHigh) {
    category = 4; tiebreak = [straightHigh];
  } else if (groups[0].count === 3) {
    category = 3; tiebreak = [groups[0].rank, ...kickers([groups[0].rank])];
  } else if (groups[0].count === 2 && groups[1]?.count === 2) {
    const pairs = [groups[0].rank, groups[1].rank].sort((a, b) => b - a);
    category = 2; tiebreak = [...pairs, kickers(pairs)[0]];
  } else if (groups[0].count === 2) {
    category = 1; tiebreak = [groups[0].rank, ...kickers([groups[0].rank])];
  }
  const [categoryName, categoryNameVi] = NAMES[category];
  // Royal flush display name
  const name = category === 8 && straightHigh === 14 ? 'Royal Flush' : categoryName;
  const nameVi = category === 8 && straightHigh === 14 ? 'Thùng phá sảnh lớn (Royal Flush)' : categoryNameVi;
  return {
    category,
    categoryName: name,
    categoryNameVi: nameVi,
    tiebreak,
    score: scoreOf(category, tiebreak),
    bestFive: cards,
  };
}

function combinations<T>(arr: T[], k: number): T[][] {
  if (k === arr.length) return [arr];
  if (k === 1) return arr.map((x) => [x]);
  const out: T[][] = [];
  for (let i = 0; i <= arr.length - k; i++) {
    for (const rest of combinations(arr.slice(i + 1), k - 1)) out.push([arr[i], ...rest]);
  }
  return out;
}

/** Evaluate the best 5-card hand out of 5–7 cards. */
export function evaluateHand(cards: Card[]): HandValue {
  if (cards.length < 5 || cards.length > 7) throw new Error('evaluateHand needs 5-7 cards');
  let best: HandValue | null = null;
  for (const five of combinations(cards, 5)) {
    const v = evaluate5(five);
    if (!best || v.score > best.score) best = { ...v, bestFive: five };
  }
  return best!;
}

export function compareHands(a: Card[], b: Card[]): number {
  return evaluateHand(a).score - evaluateHand(b).score;
}
