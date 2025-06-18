import React from 'react';

interface GameState {
  pot: number;
  currentBet: number;
  gameState: string;
  bettingRound: string;
  viewerCount: number;
}

interface GameInfoProps {
  gameState: GameState;
}

const GameInfo: React.FC<GameInfoProps> = ({ gameState }) => {
  return (
    <div className="game-info">
      <div>Pot: ${gameState.pot}</div>
      <div>Current Bet: ${gameState.currentBet}</div>
      <div>Game State: {gameState.gameState}</div>
      <div>Betting Round: {gameState.bettingRound}</div>
      {gameState.viewerCount > 0 && (
        <div>Viewers: {gameState.viewerCount}</div>
      )}
    </div>
  );
};

export default GameInfo; 