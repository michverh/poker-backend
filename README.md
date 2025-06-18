# Texas Hold'em Poker Server

A real-time Texas Hold'em poker game server built with Node.js, Socket.IO, and React.

## Features

- Real-time multiplayer poker game
- Complete Texas Hold'em rules implementation
- Viewer mode for spectators
- Responsive React frontend
- Automatic hand evaluation
- Side pot handling for all-in situations

## Tech Stack

### Backend
- Node.js with TypeScript
- Express.js server
- Socket.IO for real-time communication
- Prisma for database management

### Frontend
- React 18 with TypeScript
- Vite for fast development
- Socket.IO client
- Responsive CSS design

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd node-poker-server
   ```

2. **Install all dependencies (backend + frontend)**
   ```bash
   npm run install-all
   ```

3. **Set up the database (if using Prisma)**
   ```bash
   npx prisma generate
   npx prisma db push
   ```

### Development

#### Option 1: Run both backend and frontend together
```bash
npm run dev-full
```

#### Option 2: Run them separately

**Backend only:**
```bash
npm run dev
```

**Frontend only:**
```bash
npm run client
```

### Production Build

1. **Build the frontend:**
   ```bash
   npm run client-build
   ```

2. **Build the backend:**
   ```bash
   npm run build
   ```

3. **Start the production server:**
   ```bash
   npm start
   ```

## Usage

1. Open your browser and navigate to `http://localhost:5173` (Vite dev server)
2. Enter your name and game ID
3. Click "Join Game" to join as a player
4. Click "Start Game" to start a new game (requires at least 2 players)

### Viewer Mode

To join as a viewer (spectator):
```javascript
// In browser console or custom client
socket.emit('join-as-viewer', {
  gameId: 'your-game-id',
  viewerName: 'Spectator1'
});
```

## Game Rules

- **Blinds**: Small blind (10) and Big blind (20)
- **Betting Rounds**: Preflop, Flop, Turn, River
- **Hand Evaluation**: Full poker hand ranking system
- **All-in**: Proper side pot handling for all-in situations

## Project Structure

```
node-poker-server/
├── src/
│   ├── entities/          # Game logic (Game, Player, Card, Deck)
│   ├── handlers/          # Socket.IO event handlers
│   ├── config/           # Configuration files
│   └── types/            # TypeScript type definitions
├── client/               # React frontend
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── App.tsx       # Main app component
│   │   └── App.css       # Styles
│   └── vite.config.ts    # Vite configuration
├── prisma/              # Database schema and migrations
├── public/              # Static files (old HTML version)
└── server.ts            # Main server file
```

## API Events

### Client to Server
- `join-game`: Join as a player
- `join-as-viewer`: Join as a spectator
- `start-game`: Start a new game
- `player-action`: Perform a game action (fold, check, call, raise)

### Server to Client
- `joined-game`: Confirmation of joining as player
- `joined-as-viewer`: Confirmation of joining as viewer
- `game-update`: Real-time game state updates
- `game-update-err`: Error messages
- `viewer-joined`: Notification when viewer joins
- `viewer-left`: Notification when viewer leaves

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

ISC License


