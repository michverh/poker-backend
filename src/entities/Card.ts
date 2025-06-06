import { config } from '../config/app-config';
import type { TRank, TSuit } from "@/types";
const { ranks: RANKS } = config;


export class Card {
  rank: TRank;
  suit: TSuit;
  value: number;
  
  constructor(rank: TRank, suit: TSuit) {
    this.rank = rank;
    this.suit = suit;
    this.value = RANKS.indexOf(rank);
  }
  
  toString() {
    return `${this.rank}${this.suit[0].toUpperCase()}`;
  }
}