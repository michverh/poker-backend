import { Card }  from './Card.js';
import { config } from '../config/app-config.js';
const { suits: SUITS, ranks: RANKS } = config;

export class Deck {
  constructor() {
    this.cards = [];
    this.reset();
  }
  
  reset() {
    console.log("Did reset the deck");
    this.cards = [];
    for (let suit of SUITS) {
      for (let rank of RANKS) {
        this.cards.push(new Card(rank, suit));
      }
    }
    this.shuffle();
  }
  
  shuffle() {
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
    }
  }
  
  deal() {
    return this.cards.pop();
  }
}