import React from 'react';

interface CardProps {
  card: string;
}

const Card: React.FC<CardProps> = ({ card }) => {
  const img = card.trim() === '??' ? 'back-card.svg' : card.trim()+'.svg';
  return (
    <img src={`cards/${img}`}  className="card" />
    
  );
};

export default Card; 