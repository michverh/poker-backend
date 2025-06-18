import { Server, Socket } from "socket.io";
import { Player, Game } from "../entities";

export class SocketHandler {
  players = new Map();
  games = new Map();
  viewers = new Map(); // Track viewers separately

  constructor(private io: Server) {
    this.games = new Map();
    this.players = new Map();
    this.viewers = new Map();
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
        this.io.to(gameId).emit("game-update", game.getGameStateWithViewers(this.getViewerCount(gameId)));
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
      const player = new Player(socket.id, playerName);

      if (game.addPlayer(player)) {
        this.players.set(socket.id, { gameId, player });
        socket.join(gameId);

        this.io.to(gameId).emit("game-update", game.getGameStateWithViewers(this.getViewerCount(gameId)));
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
        this.io
          .to(playerData.gameId)
          .emit("game-update", game.getGameStateWithViewers(this.getViewerCount(playerData.gameId)));
      } else {
        console.log("err",success, message)
        this.io
          .to(playerData.gameId)
          .emit("game-update-err", message);
      }
    });

    socket.on("disconnect", () => {
      console.log("Player disconnected:", socket.id);

      const playerData = this.players.get(socket.id);
      if (playerData) {
        const game = this.games.get(playerData.gameId);
        if (game) {
          game.removePlayer(socket.id);
          this.io
            .to(playerData.gameId)
            .emit("game-update", game.getGameStateWithViewers(this.getViewerCount(playerData.gameId)));

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
}