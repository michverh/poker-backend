import { useEffect, useRef, useState } from 'react'
import './App.css'

// Types for game state (simplified for demo)
type Player = {
  id: string;
  name: string;
  chips: number;
  status: string;
  isDealer: boolean;
  isSmallBlind: boolean;
  isBigBlind: boolean;
  isSpectator: boolean;
};

type GameState = {
  players: Player[];
  currentPlayerId: string | null;
  gamePhase: string;
  message: string;
  hands?: Record<string, any[]>;
};

const WS_URL = `ws://${window.location.hostname}:3001`;

function App() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [countdown, setCountdown] = useState<number>(30);
  const wsRef = useRef<WebSocket | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const prevPlayerIdRef = useRef<string | null>(null);

  // Connect to WebSocket and handle messages
  useEffect(() => {
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'state') {
          setGameState(data.data);
        }
      } catch (e) {
        // Ignore non-JSON or unrelated messages
      }
    };
    return () => {
      ws.close();
    };
  }, []);

  // Countdown logic: reset when currentPlayerId changes
  useEffect(() => {
    if (!gameState) return;
    const currentPlayerId = gameState.currentPlayerId;
    if (prevPlayerIdRef.current !== currentPlayerId) {
      setCountdown(30);
      prevPlayerIdRef.current = currentPlayerId;
      if (timerRef.current) clearInterval(timerRef.current);
      if (currentPlayerId) {
        timerRef.current = setInterval(() => {
          setCountdown((c) => (c > 0 ? c - 1 : 0));
        }, 1000);
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameState]);

  // Stop timer at 0
  useEffect(() => {
    if (countdown === 0 && timerRef.current) {
      clearInterval(timerRef.current);
    }
  }, [countdown]);

  return (
    <div className="App">
      <h1>Poker Game</h1>
      {gameState ? (
        <>
          <div className="game-message">{gameState.message}</div>
          {/* Show all hands if present (spectator view) */}
          <div className="players-list">
            <h2>Players</h2>
            <ul>
              {gameState.players.map((p) => (
                <li key={p.id} style={{ fontWeight: p.id === gameState.currentPlayerId ? 'bold' : 'normal' }}>
                  {p.name} ({p.chips} chips)
                  {p.isDealer && ' [D]'}
                  {p.isSmallBlind && ' [SB]'}
                  {p.isBigBlind && ' [BB]'}
                  {p.status === 'folded' && ' (Folded)'}
                  {p.status === 'all-in' && ' (All-in)'}
                  {p.status === 'sitting-out' && ' (Sitting Out)'}
                  {p.status === 'spectator' && ' (Spectator)'}
                  {p.id === gameState.currentPlayerId && (
                    <span style={{ color: 'red', marginLeft: 8 }}>
                      ← Acting ({countdown}s)
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </>
      ) : (
        <div>Connecting to game...</div>
      )}
    </div>
  )
}

export default App
