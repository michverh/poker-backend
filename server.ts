import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { Player, PokerGame } from './src/entities/index';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Serve static files
app.use(express.static(join(__dirname, 'public')));

// Game state
const games = new Map();
const players = new Map();

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Player connected:', socket.id);
  
  socket.on('join-game', (data) => {
    const { gameId, playerName } = data;
    
    if (!games.has(gameId)) {
      games.set(gameId, new PokerGame(gameId, io));
    }
    
    const game = games.get(gameId);
    const player = new Player(socket.id, playerName);
    
    if (game.addPlayer(player)) {
      players.set(socket.id, { gameId, player });
      socket.join(gameId);
      
      io.to(gameId).emit('game-update', game.getGameState());
      socket.emit('joined-game', { success: true, gameId });
      
      // Auto-start game if enough players
      if (game.players.length >= 2 && game.gameState === 'waiting') {
        game.startGame();
        io.to(gameId).emit('game-update', game.getGameState());
      }
    } else {
      socket.emit('joined-game', { success: false, error: 'Game is full' });
    }
  });
  
  socket.on('player-action', (data) => {
    const playerData = players.get(socket.id);
    if (!playerData) return;
    
    const game = games.get(playerData.gameId);
    const { action, amount } = data;
    
    if (game.playerAction(socket.id, action, amount)) {
      io.to(playerData.gameId).emit('game-update', game.getGameState());
    }
  });
  
  socket.on('disconnect', () => {
    console.log('Player disconnected:', socket.id);
    
    const playerData = players.get(socket.id);
    if (playerData) {
      const game = games.get(playerData.gameId);
      if (game) {
        game.removePlayer(socket.id);
        io.to(playerData.gameId).emit('game-update', game.getGameState());
        
        // Clean up empty games
        if (game.players.length === 0) {
          games.delete(playerData.gameId);
        }
      }
      players.delete(socket.id);
    }
  });
});

// HTTP Routes
app.get('/', (req, res) => {
  res.sendFile(join(__dirname, 'public', 'index.html'));
});

app.get('/api/games', (req, res) => {
  const gameList = Array.from(games.values()).map(game => ({
    id: game.id,
    players: game.players.length,
    maxPlayers: game.maxPlayers,
    gameState: game.gameState
  }));
  res.json(gameList);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Poker server running on port ${PORT}`);
  console.log(`Visit http://localhost:${PORT} to play`);
});