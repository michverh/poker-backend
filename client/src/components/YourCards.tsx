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
}

interface YourCardsProps {
  gameState: GameState;
  myPlayerId: string;
}

const YourCards: React.FC<YourCardsProps> = ({ gameState, myPlayerId }) => {
  const myPlayer = gameState.players.find(p => p.id === myPlayerId);

  if (!myPlayer) return null;

  return (
    <div className="your-cards">
      <div>Your Cards:</div>
      <div className="hand-cards">
        {myPlayer.hand.map((card, index) => (
          <Card key={index} card={card} />
        ))}
      </div>
    </div>
  );
};

export default YourCards; 