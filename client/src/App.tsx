import { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import './App.css';
import JoinForm from './components/JoinForm';
import GameTable from './components/GameTable';
import GameInfo from './components/GameInfo';
import PlayerControls from './components/PlayerControls';
import YourCards from './components/YourCards';

interface Player {
  id: string;
  name: string;
  chips: number;
  currentBet: number;
  folded: boolean;
  hand: string[];
}

interface GameState {
  id: string;
  players: Player[];
  communityCards: string[];
  pot: number;
  currentBet: number;
  currentPlayerIndex: number;
  gameState: string;
  bettingRound: string;
  viewerCount: number;
}

interface JoinGameResponse {
  success: boolean;
  gameId?: string;
  error?: string;
  reconnected?: boolean;
  gameState?: GameState;
}

function App() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [myPlayerId, setMyPlayerId] = useState<string>('');
  const [playerName, setPlayerName] = useState<string>('');
  const [isJoined, setIsJoined] = useState(false);
  const [isViewer, setIsViewer] = useState(false);
  const [error, setError] = useState<string>('');
  const [myCards, setMyCards] = useState<string[]>([]);
  const socketRef = useRef<ReturnType<typeof io> | null>(null);

  const requestMyCards = () => {
    if (socketRef.current && !isViewer) {
      socketRef.current.emit('get-my-cards');
    }
  };

  const createSocketConnection = () => {
    if (socketRef.current) {
      return socketRef.current;
    }

    const newSocket = io();
    socketRef.current = newSocket;

    // Wait for socket to connect before getting ID
    newSocket.on('connect', () => {
      console.log('Socket connected with ID:', newSocket.id);
      setMyPlayerId(newSocket.id);
    });

    // Set up event listeners
    newSocket.on('joined-game', (data: JoinGameResponse) => {
      console.log('Joined game response:', data);
      if (data.success) {
        setIsJoined(true);
        setError('');
        // Request cards after joining
        setTimeout(() => requestMyCards(), 100);
      } else {
        setError(data.error || 'Failed to join game');
      }
    });

    newSocket.on('joined-as-viewer', (data: JoinGameResponse) => {
      console.log('Joined as viewer response:', data);
      if (data.success) {
        setIsJoined(true);
        setIsViewer(true);
        setError('');
        if (data.gameState) {
          setGameState(data.gameState);
        }
      } else {
        setError(data.error || 'Failed to join as viewer');
      }
    });

    newSocket.on('game-update', (data: GameState) => {
      console.log('Game update received:', data);
      setGameState(data);
      // Request updated cards after game update
      setTimeout(() => requestMyCards(), 100);
    });

    newSocket.on('my-cards', (data: { cards: string[] }) => {
      console.log('My cards received:', data.cards);
      setMyCards(data.cards);
    });

    newSocket.on('game-update-err', (message: string) => {
      console.log('Game error received:', message);
      setError(message);
    });

    newSocket.on('disconnect', () => {
      console.log('Socket disconnected');
      setError('Connection lost. Please refresh the page.');
    });

    newSocket.on('connect_error', (error: Error) => {
      console.log('Connection error:', error);
      setError('Failed to connect to server. Please check your connection.');
    });

    return newSocket;
  };

  const joinGame = (name: string, gameId: string) => {
    if (!name.trim()) {
      setError('Please enter your name');
      return;
    }

    setPlayerName(name);
    setIsViewer(false);
    
    const socket = createSocketConnection();
    socket.emit('join-game', { gameId, playerName: name });
  };

  const joinAsViewer = (name: string, gameId: string) => {
    if (!name.trim()) {
      setError('Please enter your name');
      return;
    }

    setPlayerName(name);
    setIsViewer(true);
    
    const socket = createSocketConnection();
    socket.emit('join-as-viewer', { gameId, viewerName: name });
  };

  const startGame = (gameId: string) => {
    const socket = createSocketConnection();
    
    console.log('Starting game with socket:', socket.id);
    socket.emit('start-game', { gameId });
    
    socket.on('started-game', (data: unknown) => {
      console.log("Game started", data);
    });
  };

  const playerAction = (action: string, amount: number = 0) => {
    if (!socketRef.current) {
      setError('No socket connection');
      return;
    }

    if (isViewer) {
      setError('Viewers cannot make game actions');
      return;
    }

    console.log('Sending player action:', action, amount);
    socketRef.current.emit('player-action', { action, amount });
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (socketRef.current) {
        console.log('Cleaning up socket connection');
        socketRef.current.disconnect();
      }
    };
  }, []);

  return (
    <div className="App">
      
      <img src='/assets/logo.svg' alt="Sytac's logo" style={{margin: "20px 0 0 20px"}} /> 
      <h1> Texas Hold'em Poker {playerName && `| ${playerName}`}</h1>
      
      {!isJoined ? (
        <JoinForm 
          onJoin={joinGame} 
          onStart={startGame} 
          onJoinAsViewer={joinAsViewer}
        />
      ) : (
        <div className="game-section">
          {isViewer && (
            <div className="viewer">
              👁️ You are watching as a viewer
            </div>
          )}
          
          {gameState && (
            <>
              <GameInfo gameState={gameState} />
              <GameTable 
                gameState={gameState} 
                myPlayerId={myPlayerId} 
                myCards={myCards}
              />
              {!isViewer && (
                <>
                  <PlayerControls 
                    gameState={gameState}
                    myPlayerId={myPlayerId}
                    onAction={playerAction}
                  />
                  <YourCards 
                    myCards={myCards}
                  />
                </>
              )}
            </>
          )}
        </div>
      )}
      
      {error && (
        <div className="error-message">
          {error}
          <button 
            onClick={() => setError('')} 
            style={{ marginLeft: '10px', padding: '5px 10px' }}
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
