import { describe, it, expect } from 'vitest';
import {
  createDeck, shuffleDeck, mulberry32, parseCards, cardToString,
  evaluateHand, evaluate5, buildSidePots, distributePots,
} from '../src/index.js';

describe('deck & shuffle', () => {
  it('deck has 52 unique cards', () => {
    const d = createDeck();
    expect(d.length).toBe(52);
    expect(new Set(d.map(cardToString)).size).toBe(52);
  });
  it('shuffle is deterministic with same seed', () => {
    const a = shuffleDeck(createDeck(), mulberry32(42)).map(cardToString).join(' ');
    const b = shuffleDeck(createDeck(), mulberry32(42)).map(cardToString).join(' ');
    const c = shuffleDeck(createDeck(), mulberry32(7)).map(cardToString).join(' ');
    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });
});

describe('hand evaluation', () => {
  const ev = (s: string) => evaluateHand(parseCards(s));
  it('royal flush is the highest straight flush', () => {
    const v = ev('As Ks Qs Js Ts 2d 3c');
    expect(v.category).toBe(8);
    expect(v.categoryName).toBe('Royal Flush');
  });
  it('wheel straight A-2-3-4-5 has high card 5', () => {
    const v = ev('As 2d 3c 4h 5s Kd Qc');
    expect(v.category).toBe(4);
    expect(v.tiebreak[0]).toBe(5);
    // wheel loses to 6-high straight
    expect(ev('2s 3d 4c 5h 6s Kd Qc').score).toBeGreaterThan(v.score);
  });
  it('four of a kind beats full house', () => {
    expect(ev('9s 9d 9c 9h 2s 3d 4c').category).toBe(7);
    expect(ev('9s 9d 9c 9h 2s 3d 4c').score).toBeGreaterThan(ev('Ks Kd Kc Qh Qs 2d 3c').score);
  });
  it('full house tiebreak uses trip rank first', () => {
    expect(ev('3s 3d 3c Kh Ks 2d 4c').score).toBeLessThan(ev('Ks Kd Kc 3h 3s 2d 4c').score);
  });
  it('flush tiebreak by ranks', () => {
    expect(ev('As 9s 7s 5s 3s 2d 4c').score).toBeGreaterThan(ev('Ks Qs 7s 5s 3s 2d 4c').score);
  });
  it('pair kicker decides', () => {
    expect(ev('As Ad Kc 9h 5s 3d 2c').score).toBeGreaterThan(ev('Ah Ac Qd 9h 5s 3d 2c').score);
  });
  it('two pair and trips categories', () => {
    expect(ev('As Ad Kc Kh 5s 3d 2c').category).toBe(2);
    expect(ev('As Ad Ac Kh 5s 3d 2c').category).toBe(3);
  });
  it('identical hands tie exactly', () => {
    expect(ev('As Kd Qc Jh Ts 2d 3c').score).toBe(ev('Ah Ks Qd Jc Th 4d 5c').score);
  });
  it('evaluate5 straight flush wheel (steel wheel)', () => {
    const v = evaluate5(parseCards('As 2s 3s 4s 5s'));
    expect(v.category).toBe(8);
    expect(v.tiebreak[0]).toBe(5);
  });
});

describe('pots', () => {
  it('single pot when equal contributions', () => {
    const pots = buildSidePots([
      { playerId: 'a', amount: 100, folded: false },
      { playerId: 'b', amount: 100, folded: false },
      { playerId: 'c', amount: 100, folded: false },
    ]);
    expect(pots).toEqual([{ amount: 300, eligible: ['a', 'b', 'c'] }]);
  });
  it('side pot from all-ins with different stacks', () => {
    const pots = buildSidePots([
      { playerId: 'a', amount: 100, folded: false },
      { playerId: 'b', amount: 300, folded: false },
      { playerId: 'c', amount: 300, folded: false },
    ]);
    expect(pots.length).toBe(2);
    expect(pots[0]).toEqual({ amount: 300, eligible: ['a', 'b', 'c'] });
    expect(pots[1]).toEqual({ amount: 400, eligible: ['b', 'c'] });
  });
  it('folded money is dead money in the pot', () => {
    const pots = buildSidePots([
      { playerId: 'a', amount: 50, folded: true },
      { playerId: 'b', amount: 100, folded: false },
      { playerId: 'c', amount: 100, folded: false },
    ]);
    const total = pots.reduce((s, p) => s + p.amount, 0);
    expect(total).toBe(250);
    expect(pots.every((p) => !p.eligible.includes('a'))).toBe(true);
  });
  it('short all-in vs two bigger stacks distributes correctly', () => {
    const pots = buildSidePots([
      { playerId: 'a', amount: 100, folded: false },
      { playerId: 'b', amount: 300, folded: false },
      { playerId: 'c', amount: 300, folded: false },
    ]);
    const scores = new Map([['a', 100], ['b', 90], ['c', 80]]);
    const { payouts } = distributePots(pots, scores, ['a', 'b', 'c']);
    expect(payouts.get('a')).toBe(300); // best hand wins main pot
    expect(payouts.get('b')).toBe(400); // second best wins side pot
    expect(payouts.get('c') ?? 0).toBe(0);
    const total = [...payouts.values()].reduce((s, x) => s + x, 0);
    expect(total).toBe(700);
  });
  it('split pot odd chip goes to earliest position left of dealer', () => {
    const pots = buildSidePots([
      { playerId: 'a', amount: 50, folded: false },
      { playerId: 'b', amount: 51, folded: false },
    ]);
    // total 101, tied hands -> 50/50 + 1 odd chip
    const scores = new Map([['a', 10], ['b', 10]]);
    const { payouts } = distributePots(pots, scores, ['b', 'a']); // b is left of dealer
    expect(payouts.get('b')).toBe(51);
    expect(payouts.get('a')).toBe(50);
  });
});
