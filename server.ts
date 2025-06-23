import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
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

// Init Websockets
const socketHandler = new SocketHandler(io);
socketHandler.initialize();

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Poker server running on port ${PORT}`);
  console.log(`Visit http://localhost:${PORT} to play`);
});