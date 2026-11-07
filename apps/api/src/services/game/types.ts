import type { Card } from '@poker/shared';

export type Street = 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';
export type ActionType = 'fold' | 'check' | 'call' | 'raise' | 'allin';

export interface SeatPlayer {
  userId: string;
  name: string;
  avatarUrl: string | null;
  seatIndex: number;
  stack: number;
  sessionId: string;
  connected: boolean;
  reservedUntil: number | null;
  sittingOut: boolean;
  // per-hand state
  inHand: boolean;
  holeCards: Card[];
  folded: boolean;
  allIn: boolean;
  betStreet: number;
  totalContributed: number;
  acted: boolean;
  showCards: boolean;
  lastAction: string | null;
}

export interface ActionLogEntry {
  street: Street;
  userId: string;
  name: string;
  action: string;
  amount: number;
}

export interface HandRecord {
  handNumber: number;
  board: string[];
  totalPot: number;
  winners: { userId: string; name: string; amount: number; handName: string | null }[];
  actionLog: ActionLogEntry[];
  holeCards: Record<string, string[]>;
  showdownInfo: Record<string, string> | null; // userId -> hand name (only shown cards)
  participantIds: string[];
}

export interface TableConfig {
  id: string;
  code: string;
  name: string;
  hostId: string;
  seatsCount: number;
  minBuyIn: number;
  smallBlind: number;
  bigBlind: number;
}
