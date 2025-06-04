export class Player {
  constructor(id, name, chips = 1000) {
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