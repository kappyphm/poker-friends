# Poker Friends — API contracts

The REST API is specified as an OpenAPI document served by the API itself:

- Swagger UI: `GET /api-docs` (development only — never mounted in production)
- Raw spec: `GET /api-docs.json`

This file documents the **Socket.IO contract**, which OpenAPI cannot express,
plus the error contract shared by both transports.

## Error contract (REST + Socket.IO)

Both transports speak exactly one error shape — a stable machine-readable
code and nothing else:

```json
{ "error": { "code": "T2001" } }
```

- Codes are defined once in `packages/shared` (`src/errors.ts`): one domain
  letter + number — `A1xxx` auth/session, `T2xxx` table/lobby, `G3xxx`
  in-game actions, `V4xxx` validation, `S5xxx` server.
- The API **never sends a human-readable message**. Each side keeps its own
  catalog: the backend maps code → HTTP status + English message (docs/logs),
  the web app maps code → Vietnamese message + a per-code handling strategy.
- Only catalogued business/validation errors reach the client. Any
  unexpected server failure is logged server-side with the request id and
  surfaces only as `S5000` (`INTERNAL_ERROR`).
- Validation may add per-field details, still code-only:
  `{ "error": { "code": "V4001", "details": [{ "field": "name", "code": "V4101" }] } }`.
- REST errors also carry the catalog HTTP status (e.g. `A1001` → 401,
  `T2001` → 404). The full code table (code, status, English meaning) is
  generated into the OpenAPI document from the backend catalog.

## Socket.IO contract

Connection: same origin as the API, session cookie required
(`withCredentials`). A connection without a valid session receives an
`error` event with `A1001` (or `A1002` when the account is gone) and is
disconnected.

Errors from any event are emitted on the **`error`** event with the standard
shape `{ "error": { "code": "<CODE>" } }`.

### Client → server events

| Event | Payload | Description | Error codes |
| ----- | ------- | ----------- | ----------- |
| `table:join` | `{ code: string, mode?: "player" \| "spectator", buyIn?: number }` | Join a table by invite code. Players must buy in at least the table minimum; spectators receive no hole cards, ever. Re-joining with an existing seat just reconnects it. | `T2003` invalid invite code, `T2008` buy-in below minimum, `T2002` table full, `S5000` |
| `table:spectate` | `{ code: string }` | Legacy hint event; spectating is done via `table:join` with `mode: "spectator"`. The server answers `table:join-hint`. | — |
| `player:rebuy` | `{ amount: number }` | Top up the caller's stack. Only between hands, or mid-hand when folded / out of chips. | `T2007` not seated, `T2010` rebuy not allowed right now, `G3008` invalid amount, `S5000` |
| `player:action` | `{ action: "fold" \| "check" \| "call" \| "raise" \| "allin", amount?: number }` | Act on the caller's turn. `amount` is the raise-to total for `raise`. | `G3001` not your turn, `G3002` invalid action, `G3003` check not allowed, `G3004` nothing to call, `G3005` raise exceeds stack, `G3006` raise below minimum, `G3007` raise not above current bet, `S5000` |
| `player:sitout` | `{ sittingOut: boolean }` | Mark the caller as sitting out / back. | — |
| `player:leave` | — | Leave the table for good: folds the current hand if needed, closes the play session (end chips + net are recorded) and frees the seat. | — |
| `host:start` | — | Host only: start the next hand. Requires at least 3 seated players with chips who are not sitting out. | `T2004` not the host, `T2005` not enough players, `T2006` hand already in progress, `S5000` |

### Server → client events

| Event | Payload | Description |
| ----- | ------- | ----------- |
| `table:state` | `TableState` (below) | Full table state, personalized per viewer: each socket only ever receives its own hole cards; other players' cards appear only when shown at showdown. Emitted after every change. |
| `table:join-hint` | `{ ok: true }` | Ack for the legacy `table:spectate` event. |
| `error` | `{ error: { code } }` | Standard error shape (see the error contract above). |

### `TableState` payload

```ts
{
  code: string;               // invite code
  name: string;
  hostId: string;
  seatsCount: number;
  minBuyIn: number;
  smallBlind: number;
  bigBlind: number;
  handInProgress: boolean;
  street: 'preflop' | 'flop' | 'turn' | 'river' | 'showdown' | null;
  board: string[];            // card codes like "As", "Td"
  pot: number;
  currentBet: number;
  minRaiseTo: number;
  turnUserId: string | null;
  turnDeadline: number | null; // epoch ms; 30s per turn
  dealerSeat: number;
  handNumber: number;
  canStart: { ok: boolean; code?: string }; // code explains why not (T2005/T2006)
  isSpectator: boolean;        // for this viewer
  lastResult: {
    handNumber: number;
    totalPot: number;
    board: string[];
    winners: { userId: string; name: string; amount: number; handRank: string | null }[];
  } | null;
  players: {
    userId: string; name: string; avatarUrl: string | null;
    seatIndex: number; stack: number;
    connected: boolean; sittingOut: boolean;
    inHand: boolean; folded: boolean; allIn: boolean;
    bet: number; totalContributed: number;
    lastAction: string | null;
    isDealer: boolean; isTurn: boolean;
    cards: string[] | null;    // viewer's own cards, or shown cards at showdown
    cardsHidden: boolean;      // player holds cards the viewer may not see
    handRank: string | null;   // hand-rank KEY (see below) when shown at showdown
  }[];
  spectatorCount: number;
}
```

### Hand-rank keys

Showdown results never carry display prose: `handRank` is a stable key from
the shared engine — `high_card`, `pair`, `two_pair`, `three_of_a_kind`,
`straight`, `flush`, `full_house`, `four_of_a_kind`, `straight_flush`,
`royal_flush`. Clients map keys to localized labels through their own
constant table (the web app uses `HAND_RANK_LABELS`).
