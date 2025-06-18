import React, { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
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

function App() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [myPlayerId, setMyPlayerId] = useState<string>('');
  const [playerName, setPlayerName] = useState<string>('');
  const [isJoined, setIsJoined] = useState(false);
  const [error, setError] = useState<string>('');

  const joinGame = (name: string, gameId: string) => {
    if (!name.trim()) {
      setError('Please enter your name');
      return;
    }

    setPlayerName(name);
    const newSocket = io();
    setSocket(newSocket);
    setMyPlayerId(newSocket.id);

    newSocket.emit('join-game', { gameId, playerName: name });

    newSocket.on('joined-game', (data) => {
      if (data.success) {
        setIsJoined(true);
        setError('');
      } else {
        setError(data.error || 'Failed to join game');
      }
    });

    newSocket.on('game-update', (data) => {
      setGameState(data);
    });

    newSocket.on('game-update-err', (message) => {
      setError(message);
    });
  };

  const startGame = (gameId: string) => {
    const newSocket = io();
    newSocket.emit('start-game', { gameId });
    
    newSocket.on('started-game', (data) => {
      console.log("Game started", data);
    });
  };

  const playerAction = (action: string, amount: number = 0) => {
    if (!socket) {
      setError('No socket connection');
      return;
    }

    socket.emit('player-action', { action, amount });
  };

  useEffect(() => {
    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [socket]);

  return (
    <div className="App">
      <h1>Texas Hold'em Poker {playerName && `| ${playerName}`}</h1>
      
      {!isJoined ? (
        <JoinForm onJoin={joinGame} onStart={startGame} />
      ) : (
        <div className="game-section">
          {gameState && (
            <>
              <GameInfo gameState={gameState} />
              <GameTable 
                gameState={gameState} 
                myPlayerId={myPlayerId} 
              />
              <PlayerControls 
                gameState={gameState}
                myPlayerId={myPlayerId}
                onAction={playerAction}
              />
              <YourCards 
                gameState={gameState}
                myPlayerId={myPlayerId}
              />
            </>
          )}
        </div>
      )}
      
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
    </div>
  );
}

export default App;
