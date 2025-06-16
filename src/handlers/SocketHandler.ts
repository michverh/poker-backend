import { Server, Socket } from "socket.io";
import { Player, Game } from "../entities";

export class SocketHandler {
  players = new Map();
  games = new Map();

  constructor(private io: Server) {
    this.games = new Map();
    this.players = new Map();
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
        this.io.to(gameId).emit("game-update", game.getGameState());
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

        this.io.to(gameId).emit("game-update", game.getGameState());
        socket.emit("joined-game", { success: true, gameId });
      } else {
        socket.emit("joined-game", { success: false, error: "Game is full" });
      }
    });

    socket.on("player-action", (data) => {
      const playerData = this.players.get(socket.id);
      if (!playerData) return;

      const game = this.games.get(playerData.gameId);
      const { action, amount } = data;

      if (game.playerAction(socket.id, action, amount)) {
        this.io
          .to(playerData.gameId)
          .emit("game-update", game.getGameState());
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
            .emit("game-update", game.getGameState());

          // Clean up empty games
          if (game.players.length === 0) {
            this.games.delete(playerData.gameId);
          }
        }
        this.players.delete(socket.id);
      }
    });
  }
}