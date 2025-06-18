import { Server, Socket } from "socket.io";
import { Player, Game } from "../entities";

export class SocketHandler {
  players = new Map();
  games = new Map();
  viewers = new Map(); // Track viewers separately
  playerNames = new Map(); // Track player names for reconnection

  constructor(private io: Server) {
    this.games = new Map();
    this.players = new Map();
    this.viewers = new Map();
    this.playerNames = new Map();
  }

  initialize() {
    this.io.on("connection", (socket) => {
      this.setupSocketEvents(socket);
    });
  }

  setupSocketEvents(socket: Socket) {
    console.log("Connection made on socketID: ", socket.id);

    socket.on("start-game", (data) => {
      const { gameId } = data;
      console.log("Trying to start game:", gameId);
        
      if (!this.games.has(gameId)) {
        this.games.set(gameId, new Game(gameId, this.io));
      }

      const game = this.games.get(gameId);
      if (game.players.length >= 2 && game.gameState === "waiting") {
        game.startGame();
        this.sendPersonalizedGameState(game, gameId);
        this.io.to(gameId).emit("started-game", "Some message from the BE");
      } else {
        console.log("There is not enough players", game.players, game.gameState);
      }
    });

    socket.on("join-game", (data) => {
      const { gameId, playerName } = data;

      if (!this.games.has(gameId)) {
        this.games.set(gameId, new Game(gameId, this.io));
      }

      const game = this.games.get(gameId);
      
      // Check if this player is trying to reconnect
      const existingPlayer = this.findPlayerByName(game, playerName);
      if (existingPlayer) {
        // Reconnect the player with new socket ID
        console.log("Player reconnecting:", playerName, "old ID:", existingPlayer.id, "new ID:", socket.id);
        existingPlayer.id = socket.id;
        existingPlayer.connected = true;
        
        this.players.set(socket.id, { gameId, player: existingPlayer });
        socket.join(gameId);

        this.sendPersonalizedGameState(game, gameId);
        socket.emit("joined-game", { success: true, gameId, reconnected: true });
        return;
      }

      // New player joining
      const player = new Player(socket.id, playerName);

      if (game.addPlayer(player)) {
        this.players.set(socket.id, { gameId, player });
        this.playerNames.set(playerName, gameId); // Track player name for reconnection
        socket.join(gameId);

        this.sendPersonalizedGameState(game, gameId);
        socket.emit("joined-game", { success: true, gameId });
      } else {
        socket.emit("joined-game", { success: false, error: "Game is full" });
      }
    });

    // New event for viewers to join
    socket.on("join-as-viewer", (data) => {
      const { gameId, viewerName } = data;
      console.log("Viewer trying to join:", viewerName, "to game:", gameId);

      if (!this.games.has(gameId)) {
        socket.emit("joined-as-viewer", { 
          success: false, 
          error: "Game does not exist" 
        });
        return;
      }

      const game = this.games.get(gameId);
      
      // Add viewer to tracking
      this.viewers.set(socket.id, { 
        gameId, 
        viewerName,
        joinedAt: new Date()
      });
      
      socket.join(gameId);

      // Send current game state to viewer
      socket.emit("joined-as-viewer", { 
        success: true, 
        gameId,
        gameState: game.getGameStateWithViewers(this.getViewerCount(gameId))
      });

      // Notify other players that a viewer joined (optional)
      socket.to(gameId).emit("viewer-joined", { 
        viewerName,
        totalViewers: this.getViewerCount(gameId)
      });

      console.log("Viewer joined:", viewerName, "Total viewers:", this.getViewerCount(gameId));
    });

    socket.on("player-action", (data) => {
      const playerData = this.players.get(socket.id);
      if (!playerData) return;

      const game = this.games.get(playerData.gameId);
      const { action, amount } = data;

      const [success, message] = game.playerAction(socket.id, action, amount);
      if (success) {
        console.log("succs",success, message)
        this.sendPersonalizedGameState(game, playerData.gameId);
      } else {
        console.log("err",success, message)
        this.io
          .to(playerData.gameId)
          .emit("game-update-err", message);
      }
    });

    // New event to get current player's cards
    socket.on("get-my-cards", () => {
      const playerData = this.players.get(socket.id);
      if (!playerData) return;

      const game = this.games.get(playerData.gameId);
      const player = game.players.find((p: Player) => p.id === socket.id);
      
      if (player) {
        socket.emit("my-cards", {
          cards: player.hand.map((card: any) => card.toString())
        });
      }
    });

    socket.on("disconnect", () => {
      console.log("Player disconnected:", socket.id);

      const playerData = this.players.get(socket.id);
      if (playerData) {
        const game = this.games.get(playerData.gameId);
        if (game) {
          // Mark player as disconnected instead of removing
          let player: Player | undefined;
          for (const p of game.players) {
            if (p.id === socket.id) {
              player = p;
              break;
            }
          }
          if (player) {
            player.connected = false;
            console.log("Player marked as disconnected:", player.name);
          }
          
          this.sendPersonalizedGameState(game, playerData.gameId);

          // Clean up empty games
          if (game.players.length === 0) {
            this.games.delete(playerData.gameId);
          }
        }
        this.players.delete(socket.id);
      }

      // Handle viewer disconnection
      const viewerData = this.viewers.get(socket.id);
      if (viewerData) {
        console.log("Viewer disconnected:", viewerData.viewerName);
        
        // Notify other players that a viewer left (optional)
        socket.to(viewerData.gameId).emit("viewer-left", { 
          viewerName: viewerData.viewerName,
          totalViewers: this.getViewerCount(viewerData.gameId) - 1
        });
        
        this.viewers.delete(socket.id);
      }
    });
  }

  // Helper method to find a player by name in a game
  findPlayerByName(game: Game, playerName: string): Player | null {
    for (const player of game.players) {
      if (player.name === playerName) {
        return player;
      }
    }
    return null;
  }

  // Helper method to get viewer count for a game
  getViewerCount(gameId: string): number {
    let count = 0;
    for (const viewer of this.viewers.values()) {
      if (viewer.gameId === gameId) {
        count++;
      }
    }
    return count;
  }

  // Helper method to get all viewers for a game
  getViewersForGame(gameId: string): Array<{ viewerName: string; joinedAt: Date }> {
    const viewers = [];
    for (const viewer of this.viewers.values()) {
      if (viewer.gameId === gameId) {
        viewers.push({
          viewerName: viewer.viewerName,
          joinedAt: viewer.joinedAt
        });
      }
    }
    return viewers;
  }

  // Helper method to send personalized game state to each player
  sendPersonalizedGameState(game: Game, gameId: string) {
    // For now, send the game state without any player cards to the room
    // This ensures no one sees other players' cards
    const safeGameState = game.getGameStateWithViewers(this.getViewerCount(gameId));
    this.io.to(gameId).emit("game-update", safeGameState);
  }
}