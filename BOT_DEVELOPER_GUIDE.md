# Bot Developer Guide for Texas Hold'em

Welcome! This guide will help you build bots that play Texas Hold'em using the provided WebSocket protocol.

---

## 1. Read the Protocol
- **Start by reading [`README.md`](./README.md)** for all message types, payloads, statuses, and game phases.

---

## 2. Connecting and Joining
- Connect to the WebSocket server (default: `ws://localhost:8080`).
- Send a `join` message with your bot's name:
  ```json
  { "type": "join", "payload": { "name": "MyBot" } }
  ```
- You can also join as a spectator using the `spectate` type.

---

## 3. Game State Tracking
- Listen for `state` messages to track the full game state, including:
  - All players and their statuses
  - Community cards
  - Pot size
  - Whose turn it is (`currentPlayerId`)
  - Game phase and betting round
- Listen for `player_hand` to receive your private cards at the start of each hand.

---

## 4. Acting
- Only send an `action` message when:
  - It is your turn (`currentPlayerId` matches your player ID)
  - Your status is `"active"`
- Example actions:
  - Fold:
    ```json
    { "type": "action", "payload": { "actionType": "fold" } }
    ```
  - Call:
    ```json
    { "type": "action", "payload": { "actionType": "call" } }
    ```
  - Raise:
    ```json
    { "type": "action", "payload": { "actionType": "raise", "amount": 100 } }
    ```
  - Check:
    ```json
    { "type": "action", "payload": { "actionType": "check" } }
    ```

---

## 5. Error Handling
- Always listen for `error` messages. These may indicate:
  - Acting out of turn
  - Invalid action (e.g., trying to check when you must call)
  - Invalid payloads
- Log or handle these errors in your bot logic.

---

## 6. Best Practices
- **State Management:**
  - Keep a local copy of the latest `GameState` for decision-making.
  - Track your own player ID (from the first `state` message after joining).
- **Timing:**
  - The server may have a short delay before processing actions. Wait for your turn!
- **Multiple Bots:**
  - You can run multiple bots by opening multiple WebSocket connections, each with a unique name.
- **Spectating:**
  - Use the `spectate` command to observe games without playing.
- **Testing:**
  - Test your bot against human players and other bots to ensure robust behavior.

---

## 7. Example Bot Loop (Pseudocode)
```python
# Pseudocode for a simple bot
connect_to_websocket()
send({"type": "join", "payload": {"name": "MyBot"}})

while True:
    msg = receive()
    if msg.type == "state":
        update_local_state(msg.payload)
        if my_id == state.currentPlayerId and my_status == "active":
            action = decide_action(state)
            send({"type": "action", "payload": action})
    elif msg.type == "player_hand":
        store_my_hand(msg.payload)
    elif msg.type == "error":
        log_error(msg.payload)
    elif msg.type == "info":
        log_info(msg.payload)
```

---

## 8. Advanced Tips
- **Strategy:** Implement poker logic for betting, folding, bluffing, etc.
- **Multiple Tables:** The current protocol is for a single table. For multi-table support, you would need to extend the protocol.
- **Bot Identification:** If you want to distinguish bots from humans, consider adding a custom field in the join payload (requires server change).

---

## 9. Troubleshooting
- If you don't receive expected messages, check your JSON formatting and message types.
- If you get repeated errors, ensure you are only acting on your turn.
- Use logging to debug your bot's decisions and server responses.

---

## 10. Questions?
If you need more features or have questions, contact the server maintainer or open an issue.

Happy bot building! 