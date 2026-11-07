export interface PlayerState {
  userId: string; name: string; avatarUrl: string | null; seatIndex: number;
  stack: number; connected: boolean; sittingOut: boolean; inHand: boolean;
  folded: boolean; allIn: boolean; bet: number; totalContributed: number;
  lastAction: string | null; isDealer: boolean; isTurn: boolean;
  cards: string[] | null; cardsHidden: boolean; handName: string | null;
}
export interface TableState {
  code: string; name: string; hostId: string; seatsCount: number;
  minBuyIn: number; smallBlind: number; bigBlind: number;
  handInProgress: boolean; street: string | null; board: string[];
  pot: number; currentBet: number; minRaiseTo: number;
  turnUserId: string | null; turnDeadline: number | null;
  dealerSeat: number; handNumber: number;
  canStart: { ok: boolean; reason?: string };
  isSpectator: boolean;
  lastResult: { handNumber: number; totalPot: number; board: string[]; winners: { userId: string; name: string; amount: number; handName: string | null }[] } | null;
  players: PlayerState[];
  spectatorCount: number;
}
