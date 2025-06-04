import { config } from '../config/app-config.js';
const { ranks: RANKS } = config;

export class Card {
  constructor(rank, suit) {
    this.rank = rank;
    this.suit = suit;
    this.value = RANKS.indexOf(rank);
  }
  
  toString() {
    return `${this.rank}${this.suit[0].toUpperCase()}`;
  }
}