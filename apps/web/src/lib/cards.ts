/** Parse a card string like "As", "Td", "9h" into display parts. */
export function cardParts(s: string): { rank: string; suit: string; red: boolean } {
  const rank = s[0] === 'T' ? '10' : s[0];
  const suitMap: Record<string, string> = { s: '♠', h: '♥', d: '♦', c: '♣' };
  return { rank, suit: suitMap[s[1]] ?? s[1], red: s[1] === 'h' || s[1] === 'd' };
}
