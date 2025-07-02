# Texas Hold'em WebSocket Protocol

This document describes the WebSocket protocol for interacting with the Texas Hold'em server. Use this as a reference for building bots or clients.

---

## Client-to-Server Messages

All messages are JSON objects with the following structure:

```
{
  "type": <string>,
  "payload": <object>
}
```

### Types and Payloads

#### 1. `join`
Join the game as a player.
- **Payload:** `{ name: string }`
- **Example:**
  ```json
  { "type": "join", "payload": { "name": "Bot1" } }
  ```

#### 2. `spectate`
Join the game as a spectator.
- **Payload:** `{ name: string }`
- **Example:**
  ```json
  { "type": "spectate", "payload": { "name": "SpectatorBot" } }
  ```

#### 3. `action`
Take an action during your turn.
- **Payload:**
  - `actionType`: one of `"fold"`, `"call"`, `"raise"`, `"check"`
  - `amount`: (number, required for `raise`)
- **Example (raise):**
  ```json
  { "type": "action", "payload": { "actionType": "raise", "amount": 100 } }
  ```
- **Example (fold):**
  ```json
  { "type": "action", "payload": { "actionType": "fold" } }
  ```

#### 4. `ready`
Signal readiness to start the game (optional, used to trigger game start if enough players).
- **Payload:** `{}`
- **Example:**
  ```json
  { "type": "ready", "payload": {} }
  ```

---

## Server-to-Client Messages

All messages are JSON objects with the following structure:

```
{
  "type": <string>,
  "payload": <object|string|array>
}
```

### Types and Payloads

#### 1. `state`
Broadcasts the full public game state.
- **Payload:** `GameState` (see below)

#### 2. `player_hand`
Sends your private hole cards.
- **Payload:** `Card[]` (array of 2 cards)

#### 3. `info`
Informational message (e.g., join confirmation, hand results, etc.).
- **Payload:** `string`

#### 4. `error`
Error message (e.g., invalid action, not your turn, etc.).
- **Payload:** `string`

---

## Data Structures

### Card
```
{
  "rank": "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K" | "A",
  "suit": "H" | "D" | "C" | "S"
}
```

### GameState
```
{
  "players": [
    {
      "id": string,
      "name": string,
      "chips": number,
      "status": "active" | "folded" | "all-in" | "sitting-out" | "spectator",
      "currentBet": number,
      "isDealer": boolean,
      "isSmallBlind": boolean,
      "isBigBlind": boolean,
      "isSpectator": boolean
    },
    ...
  ],
  "communityCards": Card[],
  "pot": number,
  "currentBettingRound": "pre-flop" | "flop" | "turn" | "river" | null,
  "currentPlayerId": string | null,
  "gamePhase": "waiting" | "pre-flop" | "flop" | "turn" | "river" | "showdown" | "hand-over",
  "message": string,
  "minimumRaiseAmount": number,
  "minimumBetForCall": number
}
```

---

## Player Statuses
- `"active"`: Player is in the current hand and can act.
- `"folded"`: Player folded this hand (will be reactivated next hand if they have chips).
- `"all-in"`: Player is all-in and cannot act further this hand.
- `"sitting-out"`: Player is not participating in the current hand (e.g., joined mid-game or out of chips).
- `"spectator"`: Player is a spectator and cannot play.

## Game Phases
- `"waiting"`: Waiting for enough players.
- `"pre-flop"`: Pre-flop betting round.
- `"flop"`: Flop betting round.
- `"turn"`: Turn betting round.
- `"river"`: River betting round.
- `"showdown"`: Showdown (winner determination).
- `"hand-over"`: Hand is over, preparing for next hand.

---

## Notes for Bot Developers
- Only act when it is your turn (your player ID matches `currentPlayerId` in the `GameState`).
- Always check your status (`active`, `all-in`, etc.) before acting.
- Use the `player_hand` message to get your private cards at the start of each hand.
- Use the `state` message to track the full game state and community cards.
- Handle `error` and `info` messages for feedback.

---

## Do You Need Code Changes for Bots?
- **No major changes needed.** The protocol is already bot-friendly and stateless.
- **Optional:**
  - If you want to add a bot-specific join type or authentication, you could add a `bot` flag to the join payload.
  - If you want to reduce server-side delays (e.g., the 1-second delay before processing actions), you can remove or reduce the `setTimeout` in the server's action handler.

Let me know if you want to add any bot-specific features or have questions about the protocol! 