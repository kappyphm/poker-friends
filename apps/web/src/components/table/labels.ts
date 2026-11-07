import type { HandRankKey } from '@poker/shared';

export const STREET_VI: Record<string, string> = {
  preflop: 'Pre-flop', flop: 'Flop', turn: 'Turn', river: 'River', showdown: 'Showdown',
};
export const ACTION_VI: Record<string, string> = {
  fold: 'Úp bỏ', check: 'Check', call: 'Call', raise: 'Raise', 'all-in': 'All-in',
  'small-blind': 'Small Blind', 'big-blind': 'Big Blind',
};

/**
 * Hand rank key → Vietnamese display label. The API/engine only ever sends
 * the key; this constant map is the single place keys become display text.
 */
export const HAND_RANK_LABELS: Record<HandRankKey, string> = {
  high_card: 'Bài cao',
  pair: 'Một đôi',
  two_pair: 'Hai đôi',
  three_of_a_kind: 'Bộ ba (sám)',
  straight: 'Sảnh',
  flush: 'Thùng',
  full_house: 'Cù lũ',
  four_of_a_kind: 'Tứ quý',
  straight_flush: 'Thùng phá sảnh',
  royal_flush: 'Thùng phá sảnh lớn (Royal Flush)',
};

/**
 * Resolve a stored/sent hand-rank value to its display label. Values that
 * are not known keys (records persisted before handRank keys existed hold
 * ready-made Vietnamese names) pass through unchanged.
 */
export function handRankLabel(value: string | null | undefined): string | null {
  if (!value) return null;
  return (HAND_RANK_LABELS as Record<string, string>)[value] ?? value;
}
