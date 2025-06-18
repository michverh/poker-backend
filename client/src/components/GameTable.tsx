import React from 'react';
import Card from './Card';

interface Player {
  id: string;
  name: string;
  chips: number;
  currentBet: number;
  folded: boolean;
  hand: string[];
}

interface GameState {
  players: Player[];
  communityCards: string[];
  currentPlayerIndex: number;
  gameState: string;
}

interface GameTableProps {
  gameState: GameState;
  myPlayerId: string;
}

const GameTable: React.FC<GameTableProps> = ({ gameState, myPlayerId }) => {
  return (
    <div className="poker-table">
      <div className="community-cards">
        {gameState.communityCards.map((card, index) => (
          <Card key={index} card={card} />
        ))}
      </div>
      <div className="player-positions">
        {gameState.players.map((player, index) => (
          <div
            key={player.id}
            className={`player ${index === gameState.currentPlayerIndex && gameState.gameState === 'betting' ? 'current' : ''} ${player.folded ? 'folded' : ''}`}
          >
            <div className="player-name">{player.name}</div>
            <div className="player-chips">${player.chips}</div>
            <div className="player-chips">Bet: ${player.currentBet}</div>
            <div className="player-cards">
              {player.id === myPlayerId ? (
                player.hand.map((card, cardIndex) => (
                  <Card key={cardIndex} card={card} />
                ))
              ) : (
                <>
                  <Card card="??" />
                  <Card card="??" />
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default GameTable; 