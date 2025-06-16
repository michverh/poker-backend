import { Card } from './Card';

export class Player {
  id: string;
  name: string;
  chips: number;
  hand: Card[];
  currentBet: number;
  totalBet: number;
  folded: boolean;
  allIn: boolean;
  connected: boolean;

  constructor(id: string, name: string, chips = 100) {
    this.id = id;
    this.name = name;
    this.chips = chips;
    this.hand = [];
    this.currentBet = 0;
    this.totalBet = 0;
    this.folded = false;
    this.allIn = false;
    this.connected = true;
  }
  
  reset() {
    this.hand = [];
    this.currentBet = 0;
    this.totalBet = 0;
    this.folded = false;
    this.allIn = false;
  }
}