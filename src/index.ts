import { type WebSocket, WebSocketServer } from "ws";
import type { ClientMessage } from "./game/interfaces";
import { TexasHoldemGame } from "./game/TexasHoldemGame";
import { logger } from "./utils/logger";

const PORT = 8080;

const wss = new WebSocketServer({ port: PORT });
const game = new TexasHoldemGame(); // Instantiate the game

wss.on("listening", () => {
  logger.info(`Texas Hold'em server running on ws://localhost:${PORT}`);
});

wss.on("connection", (ws: WebSocket) => {
  logger.info("Client connected.");

  ws.on("message", (message: string) => {
    try {
      const parsedMessage: ClientMessage = JSON.parse(message);
      logger.info("Received message:", parsedMessage);

      switch (parsedMessage.type) {
        case "join":
          if (parsedMessage.payload.name) {
            game.addPlayer(ws, parsedMessage.payload.name, false); // Not a spectator
          } else {
            ws.send(
              JSON.stringify({
                type: "error",
                payload: "Please provide a name to join.",
              })
            );
            logger.warn("Join attempt without a name.");
          }
          break;
        case "spectate":
          if (parsedMessage.payload.name) {
            game.addPlayer(ws, parsedMessage.payload.name, true); // As a spectator
          } else {
            ws.send(
              JSON.stringify({
                type: "error",
                payload: "Please provide a name to spectate.",
              })
            );
            logger.warn("Spectate attempt without a name.");
          }
          break;
        case "ready":
          // A client signaling 'ready' could trigger game start if conditions met.
          game.checkAndStartGame();
          break;
        case "action": {
          const player = game.players.find((p) => p.socket === ws);
          if (player && parsedMessage.payload.actionType) {
            setTimeout(() => {
              game.handlePlayerAction(
                player.id,
                parsedMessage.payload.actionType || "fold",
                parsedMessage.payload.amount
              );
            }, 1000);
          } else {
            ws.send(
              JSON.stringify({
                type: "error",
                payload: "Invalid action or player not found for action.",
              })
            );
            logger.warn(
              `Invalid action or player not found for action. Player exists: ${!!player}, ActionType: ${
                parsedMessage.payload.actionType
              }`
            );
          }
          break;
        }
        default:
          ws.send(
            JSON.stringify({ type: "error", payload: "Unknown message type." })
          );
          logger.warn(`Received unknown message type: ${parsedMessage.type}.`);
          break;
      }
    } catch (error) {
      logger.error("Failed to parse message:", error);
      ws.send(
        JSON.stringify({ type: "error", payload: "Invalid JSON message." })
      );
    }
  });

  ws.on("close", () => {
    logger.info("Client disconnected.");
    game.removePlayer(ws);
  });

  ws.on("error", (error) => {
    logger.error("WebSocket error:", error);
  });
});
