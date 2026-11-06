export interface Contribution {
  playerId: string;
  amount: number; // total contributed this hand
  folded: boolean;
}

export interface SidePot {
  amount: number;
  eligible: string[]; // non-folded players who can win this pot
}

/**
 * Build main/side pots from total contributions.
 * Folded players' chips stay in the pots as dead money but they are not eligible.
 */
export function buildSidePots(contributions: Contribution[]): SidePot[] {
  const levels = [...new Set(contributions.map((c) => c.amount).filter((a) => a > 0))].sort(
    (a, b) => a - b,
  );
  const pots: SidePot[] = [];
  let prev = 0;
  for (const level of levels) {
    const atLevel = contributions.filter((c) => c.amount >= level);
    const amount = (level - prev) * atLevel.length;
    const eligible = atLevel.filter((c) => !c.folded).map((c) => c.playerId);
    if (amount > 0 && eligible.length > 0) {
      const last = pots[pots.length - 1];
      if (last && last.eligible.join(',') === eligible.join(',')) last.amount += amount;
      else pots.push({ amount, eligible: [...eligible] });
    }
    prev = level;
  }
  return pots;
}

export interface PotResult {
  potIndex: number;
  amount: number;
  winners: string[];
  each: number;
}

/**
 * Distribute pots. scores: playerId -> hand score (higher wins).
 * orderFromDealer: playerIds in positional order starting with the first seat
 * left of the dealer — used for the odd-chip rule on split pots.
 */
export function distributePots(
  pots: SidePot[],
  scores: Map<string, number>,
  orderFromDealer: string[],
): { payouts: Map<string, number>; results: PotResult[] } {
  const payouts = new Map<string, number>();
  const results: PotResult[] = [];
  pots.forEach((pot, potIndex) => {
    const best = Math.max(...pot.eligible.map((id) => scores.get(id) ?? -Infinity));
    const winners = pot.eligible.filter((id) => (scores.get(id) ?? -Infinity) === best);
    const each = Math.floor(pot.amount / winners.length);
    let remainder = pot.amount - each * winners.length;
    for (const w of winners) payouts.set(w, (payouts.get(w) ?? 0) + each);
    // Odd chips: one at a time to winners in order starting left of dealer.
    const ordered = orderFromDealer.filter((id) => winners.includes(id));
    let i = 0;
    while (remainder > 0 && ordered.length > 0) {
      const w = ordered[i % ordered.length];
      payouts.set(w, (payouts.get(w) ?? 0) + 1);
      remainder--; i++;
    }
    results.push({ potIndex, amount: pot.amount, winners, each });
  });
  return { payouts, results };
}
