import React, { useState } from 'react';

interface JoinFormProps {
  onJoin: (name: string, gameId: string) => void;
  onStart: (gameId: string) => void;
}

const JoinForm: React.FC<JoinFormProps> = ({ onJoin, onStart }) => {
  const [playerName, setPlayerName] = useState('');
  const [gameId, setGameId] = useState('g');

  const handleJoin = () => {
    onJoin(playerName, gameId);
  };

  const handleStart = () => {
    onStart(gameId);
  };

  return (
    <div className="join-form">
      <input
        type="text"
        placeholder="Enter your name"
        value={playerName}
        onChange={(e) => setPlayerName(e.target.value)}
      />
      <input
        type="text"
        placeholder="Game ID (optional)"
        value={gameId}
        onChange={(e) => setGameId(e.target.value)}
      />
      <button onClick={handleJoin}>Join Game</button>
      <button onClick={handleStart}>Start Game</button>
    </div>
  );
};

export default JoinForm; 