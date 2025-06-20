import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { SocketHandler } from './src/handlers/SocketHandler';

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

// Init Websockets
const socketHandler = new SocketHandler(io);
socketHandler.initialize();

// HTTP Routes
  // app.get('/', (req, res) => {
  //   res.sendFile(join(__dirname, 'public', 'index.html'));
  // });

// app.get('/api/games', (req, res) => {
//   const gameList = Array.from(games.values()).map(game => ({
//     id: game.id,
//     players: game.players.length,
//     maxPlayers: game.maxPlayers,
//     gameState: game.gameState
//   }));
//   res.json(gameList);
// });

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Poker server running on port ${PORT}`);
  console.log(`Visit http://localhost:${PORT} to play`);
});