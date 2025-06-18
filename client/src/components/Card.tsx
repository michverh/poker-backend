import React from 'react';

interface CardProps {
  card: string;
}

const Card: React.FC<CardProps> = ({ card }) => {
  return (
    <div className="card">
      {card}
    </div>
  );
};

export default Card; 