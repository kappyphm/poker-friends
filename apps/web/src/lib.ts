export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
}

export async function api<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? `Lỗi ${res.status}`);
  return data as T;
}

export function fmt(n: number): string {
  return n.toLocaleString('vi-VN');
}

/** Parse a card string like "As", "Td", "9h" into display parts. */
export function cardParts(s: string): { rank: string; suit: string; red: boolean } {
  const rank = s[0] === 'T' ? '10' : s[0];
  const suitMap: Record<string, string> = { s: '♠', h: '♥', d: '♦', c: '♣' };
  return { rank, suit: suitMap[s[1]] ?? s[1], red: s[1] === 'h' || s[1] === 'd' };
}
