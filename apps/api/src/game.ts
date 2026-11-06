import {
  createDeck, shuffleDeck, mulberry32, cardToString,
  evaluateHand, buildSidePots, distributePots,
  type Card,
} from '@poker/shared';

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

const STREETS: Street[] = ['preflop', 'flop', 'turn', 'river'];

export class GameTable {
  cfg: TableConfig;
  seats = new Map<number, SeatPlayer>();
  spectators = new Set<string>();
  dealerSeat = -1;
  handNumber = 0;
  street: Street | null = null;
  board: Card[] = [];
  deck: Card[] = [];
  currentBet = 0;
  lastRaiseSize = 0;
  turnSeat: number | null = null;
  turnDeadline: number | null = null;
  actionLog: ActionLogEntry[] = [];
  lastResult: HandRecord | null = null;
  onHandComplete: ((rec: HandRecord) => Promise<void> | void) | null = null;
  onStateChange: (() => void) | null = null;

  constructor(cfg: TableConfig) {
    this.cfg = cfg;
    this.lastRaiseSize = cfg.bigBlind;
  }

  get handInProgress() {
    return this.street !== null && this.street !== 'showdown';
  }

  playerByUser(userId: string): SeatPlayer | undefined {
    for (const p of this.seats.values()) if (p.userId === userId) return p;
    return undefined;
  }

  activePlayers(): SeatPlayer[] {
    return [...this.seats.values()]
      .filter((p) => p.inHand && !p.folded)
      .sort((a, b) => a.seatIndex - b.seatIndex);
  }

  /** Players dealt into the current hand (incl. folded). */
  handPlayers(): SeatPlayer[] {
    return [...this.seats.values()]
      .filter((p) => p.inHand)
      .sort((a, b) => a.seatIndex - b.seatIndex);
  }

  canStart(): { ok: boolean; reason?: string } {
    if (this.handInProgress) return { ok: false, reason: 'Ván đang diễn ra' };
    const ready = [...this.seats.values()].filter(
      (p) => p.stack > 0 && !p.sittingOut,
    );
    if (ready.length < 3) return { ok: false, reason: 'Cần tối thiểu 3 người có chip và không vắng mặt' };
    return { ok: true };
  }

  startHand() {
    const ready = [...this.seats.values()]
      .filter((p) => p.stack > 0 && !p.sittingOut)
      .sort((a, b) => a.seatIndex - b.seatIndex);
    if (ready.length < 3) throw new Error('Chưa đủ 3 người chơi');

    this.handNumber++;
    this.actionLog = [];
    this.board = [];
    const seed = Math.floor(Math.random() * 2 ** 31);
    this.deck = shuffleDeck(createDeck(), mulberry32(seed));

    for (const p of this.seats.values()) {
      p.inHand = false; p.holeCards = []; p.folded = false; p.allIn = false;
      p.betStreet = 0; p.totalContributed = 0; p.acted = false;
      p.showCards = false; p.lastAction = null;
    }
    for (const p of ready) {
      p.inHand = true;
      p.holeCards = [this.deck.pop()!, this.deck.pop()!];
    }
    // dealer rotation
    const seatsIdx = ready.map((p) => p.seatIndex);
    const nextDealer = seatsIdx.find((s) => s > this.dealerSeat) ?? seatsIdx[0];
    this.dealerSeat = nextDealer;
    const order = this.rotateFrom(ready, this.dealerSeat); // [dealer, sb, bb, ...]
    const sb = order[1];
    const bb = order[2];
    this.street = 'preflop';
    this.currentBet = 0;
    this.lastRaiseSize = this.cfg.bigBlind;
    this.postBlind(sb, this.cfg.smallBlind, 'small-blind');
    this.postBlind(bb, this.cfg.bigBlind, 'big-blind');
    this.currentBet = Math.max(...ready.map((p) => p.betStreet));
    // BB counts as not yet acted preflop (option), everyone must act
    for (const p of ready) p.acted = false;
    // first to act preflop: seat after BB (with 3 players this is the dealer)
    const firstActor = order.length > 3 ? order[3] : order[0];
    if (!firstActor.allIn) this.turnSeat = firstActor.seatIndex;
    else this.turnSeat = this.findNextActor(firstActor.seatIndex);
    this.emit();
  }

  private rotateFrom(players: SeatPlayer[], fromSeat: number): SeatPlayer[] {
    const sorted = [...players].sort((a, b) => a.seatIndex - b.seatIndex);
    const i = sorted.findIndex((p) => p.seatIndex === fromSeat);
    return [...sorted.slice(i), ...sorted.slice(0, i)];
  }

  private postBlind(p: SeatPlayer, amount: number, label: string) {
    const pay = Math.min(p.stack, amount);
    p.stack -= pay;
    p.betStreet += pay;
    p.totalContributed += pay;
    if (p.stack === 0) p.allIn = true;
    p.lastAction = label;
    this.actionLog.push({ street: 'preflop', userId: p.userId, name: p.name, action: label, amount: pay });
  }

  turnPlayer(): SeatPlayer | null {
    if (this.turnSeat === null) return null;
    return this.seats.get(this.turnSeat) ?? null;
  }

  toCall(p: SeatPlayer): number {
    return Math.max(0, this.currentBet - p.betStreet);
  }

  minRaiseTo(): number {
    return this.currentBet + this.lastRaiseSize;
  }

  applyAction(userId: string, action: ActionType, amount?: number) {
    const p = this.turnPlayer();
    if (!p || p.userId !== userId) throw new Error('Chưa tới lượt của bạn');
    if (!this.handInProgress || !p.inHand || p.folded || p.allIn) throw new Error('Hành động không hợp lệ');

    const toCall = this.toCall(p);
    let logAmount = 0;
    let wasRaise = false;

    if (action === 'fold') {
      p.folded = true;
      p.lastAction = 'fold';
    } else if (action === 'check') {
      if (toCall !== 0) throw new Error('Không thể check khi cần theo bài');
      p.lastAction = 'check';
    } else if (action === 'call') {
      if (toCall === 0) throw new Error('Không có gì để call, hãy check');
      const pay = Math.min(p.stack, toCall);
      this.pay(p, pay);
      logAmount = pay;
      p.lastAction = 'call';
    } else if (action === 'allin') {
      const pay = p.stack;
      const before = this.currentBet;
      this.pay(p, pay);
      logAmount = pay;
      p.lastAction = 'all-in';
      if (p.betStreet > before) {
        wasRaise = true;
        const inc = p.betStreet - before;
        if (inc >= this.lastRaiseSize) this.lastRaiseSize = inc;
      }
    } else if (action === 'raise') {
      const target = amount ?? 0;
      const maxTo = p.betStreet + p.stack;
      const minTo = this.minRaiseTo();
      if (target > maxTo) throw new Error('Số chip raise vượt quá stack');
      if (target < minTo && target !== maxTo) throw new Error(`Raise tối thiểu tới ${minTo}`);
      if (target <= this.currentBet) throw new Error('Số chip raise phải lớn hơn mức cược hiện tại');
      const inc = target - this.currentBet;
      const pay = target - p.betStreet;
      this.pay(p, pay);
      logAmount = pay;
      p.lastAction = 'raise';
      wasRaise = true;
      if (inc >= this.lastRaiseSize) this.lastRaiseSize = inc;
    }
    p.acted = true;
    if (wasRaise) {
      for (const q of this.handPlayers()) {
        if (q !== p && !q.folded && !q.allIn) q.acted = false;
      }
      p.acted = true;
    }
    this.actionLog.push({
      street: this.street!, userId: p.userId, name: p.name,
      action: p.lastAction!, amount: logAmount,
    });
    this.afterAction();
  }

  private pay(p: SeatPlayer, amount: number) {
    p.stack -= amount;
    p.betStreet += amount;
    p.totalContributed += amount;
    if (p.stack === 0) p.allIn = true;
    if (p.betStreet > this.currentBet) this.currentBet = p.betStreet;
  }

  /** Auto action for timeout / disconnect: check if possible else fold. */
  autoAction(userId: string) {
    const p = this.turnPlayer();
    if (!p || p.userId !== userId || !this.handInProgress) return;
    if (this.toCall(p) === 0) this.applyAction(userId, 'check');
    else this.applyAction(userId, 'fold');
  }

  private findNextActor(fromSeat: number): number | null {
    const sorted = this.handPlayers(); // sorted by seatIndex
    if (sorted.length === 0) return null;
    const start = sorted.findIndex((x) => x.seatIndex === fromSeat);
    for (let step = 1; step <= sorted.length; step++) {
      const cand = sorted[(start + step) % sorted.length];
      if (!cand.folded && !cand.allIn && (!cand.acted || cand.betStreet < this.currentBet)) {
        return cand.seatIndex;
      }
    }
    return null;
  }

  private roundComplete(): boolean {
    const contenders = this.activePlayers();
    return contenders.every(
      (p) => p.allIn || (p.acted && p.betStreet === this.currentBet),
    );
  }

  private afterAction() {
    const contenders = this.activePlayers();
    if (contenders.length <= 1 || this.roundComplete()) {
      this.advanceStreetOrFinish();
    } else {
      const cur = this.turnSeat!;
      const next = this.findNextActor(cur);
      if (next === null) this.advanceStreetOrFinish();
      else {
        this.turnSeat = next;
        this.emit();
      }
    }
    this.emit();
  }

  private advanceStreetOrFinish() {
    const contenders = this.activePlayers();
    if (contenders.length <= 1) return this.finishHand();
    const idx = STREETS.indexOf(this.street as Street);
    if (idx === STREETS.length - 1) return this.finishHand();
    // move to next street, dealing board as needed; loop while nobody can act
    let s = idx;
    while (s < STREETS.length - 1) {
      s++;
      this.street = STREETS[s];
      if (this.street === 'flop') this.board.push(this.deck.pop()!, this.deck.pop()!, this.deck.pop()!);
      else this.board.push(this.deck.pop()!);
      for (const p of this.handPlayers()) {
        p.betStreet = 0; p.acted = false; p.lastAction = null;
      }
      this.currentBet = 0;
      this.lastRaiseSize = this.cfg.bigBlind;
      const canAct = this.activePlayers().filter((p) => !p.allIn);
      if (canAct.length === 0) continue; // everyone all-in: deal out the board
      if (canAct.length === 1 && this.activePlayers().every((p) => p.allIn || p === canAct[0])) {
        // single actor with nobody to bet against after this street check: if all others all-in, run out board
        const othersAllIn = this.activePlayers().filter((p) => p !== canAct[0]).every((p) => p.allIn);
        if (othersAllIn) continue;
      }
      break;
    }
    if (this.street === 'river' && this.activePlayers().every((p) => p.allIn)) {
      return this.finishHand();
    }
    if (this.activePlayers().filter((p) => !p.allIn).length === 0) return this.finishHand();
    // first actor: first can-act player left of dealer
    const order = this.rotateFrom(this.handPlayers(), this.dealerSeat);
    const first = order.find((p) => !p.folded && !p.allIn);
    if (!first) return this.finishHand();
    // if it's river and the loop above already dealt everything and nobody can bet, finish
    this.turnSeat = first.seatIndex;
  }

  private finishHand() {
    const participants = this.handPlayers();
    const contenders = this.activePlayers();
    this.street = 'showdown';
    this.turnSeat = null;
    this.turnDeadline = null;

    const contributions = participants.map((p) => ({
      playerId: p.userId, amount: p.totalContributed, folded: p.folded,
    }));
    const totalPot = contributions.reduce((s, c) => s + c.amount, 0);
    const pots = buildSidePots(contributions);

    const anyAllIn = contenders.some((p) => p.allIn);
    const scores = new Map<string, number>();
    const handNames = new Map<string, string>();
    let payouts = new Map<string, number>();

    if (contenders.length === 1) {
      const winner = contenders[0];
      payouts.set(winner.userId, totalPot);
      winner.showCards = false; // uncontested: cards stay hidden
    } else {
      for (const p of contenders) {
        const v = evaluateHand([...p.holeCards, ...this.board]);
        scores.set(p.userId, v.score);
        handNames.set(p.userId, v.categoryNameVi);
      }
      const orderFromDealer = this.rotateFrom(participants, this.dealerSeat)
        .slice(1)
        .concat(this.rotateFrom(participants, this.dealerSeat).slice(0, 1))
        .map((p) => p.userId);
      const dist = distributePots(pots, scores, orderFromDealer);
      payouts = dist.payouts;
      // conservation: any undistributed remainder (dead-money edge) goes to best hand(s)
      const distributed = [...payouts.values()].reduce((s, x) => s + x, 0);
      if (distributed < totalPot) {
        const best = Math.max(...contenders.map((p) => scores.get(p.userId)!));
        const bestWinners = contenders.filter((p) => scores.get(p.userId) === best);
        const extra = totalPot - distributed;
        payouts.set(bestWinners[0].userId, (payouts.get(bestWinners[0].userId) ?? 0) + extra);
      }
      // reveal rules: winners always show; losers show only if an all-in happened
      for (const p of contenders) {
        if ((payouts.get(p.userId) ?? 0) > 0) p.showCards = true;
        else p.showCards = anyAllIn;
      }
    }

    for (const [userId, amount] of payouts) {
      const p = this.playerByUser(userId);
      if (p) p.stack += amount;
    }

    const winners = [...payouts.entries()]
      .filter(([, amt]) => amt > 0)
      .map(([userId, amount]) => {
        const p = this.playerByUser(userId)!;
        return {
          userId, name: p.name, amount,
          handName: contenders.length > 1 ? (handNames.get(userId) ?? null) : null,
        };
      });

    const holeCards: Record<string, string[]> = {};
    for (const p of participants) holeCards[p.userId] = p.holeCards.map(cardToString);
    const showdownInfo: Record<string, string> = {};
    for (const p of contenders) {
      if (p.showCards && handNames.has(p.userId)) showdownInfo[p.userId] = handNames.get(p.userId)!;
    }

    const rec: HandRecord = {
      handNumber: this.handNumber,
      board: this.board.map(cardToString),
      totalPot,
      winners,
      actionLog: [...this.actionLog],
      holeCards,
      showdownInfo: Object.keys(showdownInfo).length ? showdownInfo : null,
      participantIds: participants.map((p) => p.userId),
    };
    this.lastResult = rec;
    // reset per-hand bets display
    for (const p of participants) p.betStreet = 0;
    if (this.onHandComplete) {
      Promise.resolve(this.onHandComplete(rec)).catch((e) => console.error('persist hand failed', e));
    }
    this.emit();
  }

  emit() {
    this.onStateChange?.();
  }
}
