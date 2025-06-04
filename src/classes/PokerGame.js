import { Deck } from './Deck.js';
const MAX_PLAYERS = 8;

export class PokerGame {
  constructor(id, io = undefined, maxPlayers = MAX_PLAYERS) {
    this.id = id;
    this.maxPlayers = maxPlayers;
    this.players = [];
    this.deck = new Deck();
    this.communityCards = [];
    this.pot = 0;
    this.currentBet = 0;
    this.currentPlayerIndex = 0;
    this.dealerIndex = 0;
    this.smallBlind = 10;
    this.bigBlind = 20;
    this.gameState = 'waiting'; // waiting, dealing, betting, showdown, finished
    this.bettingRound = 'preflop'; // preflop, flop, turn, river
    this.io = io; // @TODO: there might be a better way for this
  }
  
  addPlayer(player) {
    if (this.players.length < this.maxPlayers) {
      this.dealToPlayer(player);
      this.players.push(player);
      return true;
    }
    return false;
  }
  
  removePlayer(playerId) {
    this.players = this.players.filter(p => p.id !== playerId);
  }
  
  startGame() {
    if (this.players.length < 2) return false;
    console.log("Starting new game")
    this.gameState = 'dealing';
    this.pot = 0;
    this.currentBet = this.bigBlind;
    this.communityCards = [];
    this.deck.reset();
    
    // Reset all players
    this.players.forEach(player => player.reset());
    
    // Post blinds
    this.postBlinds();
    
    // Deal hole cards
    this.dealHoleCards();
    
    this.gameState = 'betting';
    this.bettingRound = 'preflop';
    
    return true;
  }
  
  postBlinds() {
    const smallBlindPlayer = this.players[(this.dealerIndex + 1) % this.players.length];
    const bigBlindPlayer = this.players[(this.dealerIndex + 2) % this.players.length];
    
    smallBlindPlayer.currentBet = this.smallBlind;
    smallBlindPlayer.totalBet = this.smallBlind;
    smallBlindPlayer.chips -= this.smallBlind;
    
    bigBlindPlayer.currentBet = this.bigBlind;
    bigBlindPlayer.totalBet = this.bigBlind;
    bigBlindPlayer.chips -= this.bigBlind;
    
    this.pot = this.smallBlind + this.bigBlind;
    this.currentPlayerIndex = (this.dealerIndex + 3) % this.players.length;
  }
  
  dealHoleCards() {
    // Deal 2 cards to each player
    for (let i = 0; i < 2; i++) {
      this.players.forEach(player => {
        if (!player.folded) {
          player.hand.push(this.deck.deal());
        }
      });
    }
  }

  dealToPlayer(player) {
    if (!player) return;
    for (let i = 0; i < 2; i++) {
      player.hand.push(this.deck.deal());
    }
  }

  
  dealCommunityCards(count) {
    for (let i = 0; i < count; i++) {
      this.communityCards.push(this.deck.deal());
    }
  }
  
  playerAction(playerId, action, amount = 0) {
    const player = this.players.find(p => p.id === playerId);
    if (!player || player.folded || this.players[this.currentPlayerIndex].id !== playerId) {
      return false;
    }
    
    switch (action) {
      case 'fold':
        player.folded = true;
        break;
        
      case 'call':
        const callAmount = Math.min(this.currentBet - player.currentBet, player.chips);
        player.chips -= callAmount;
        player.currentBet += callAmount;
        player.totalBet += callAmount;
        this.pot += callAmount;
        break;
        
      case 'raise':
        const raiseAmount = Math.min(amount, player.chips);
        player.chips -= raiseAmount;
        player.currentBet += raiseAmount;
        player.totalBet += raiseAmount;
        this.pot += raiseAmount;
        this.currentBet = player.currentBet;
        break;
        
      case 'check':
        if (player.currentBet === this.currentBet) {
          // Valid check
        } else {
          return false;
        }
        break;
    }
    
    this.nextPlayer();
    return true;
  }
  
  nextPlayer() {
    do {
      this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
    } while (this.players[this.currentPlayerIndex].folded);
    
    // Check if betting round is complete
    if (this.isBettingRoundComplete()) {
      this.nextBettingRound();
    }
  }
  
  isBettingRoundComplete() {
    const activePlayers = this.players.filter(p => !p.folded);
    return activePlayers.every(p => p.currentBet === this.currentBet || p.chips === 0);
  }
  
  nextBettingRound() {
    // Reset current bets for next round
    this.players.forEach(player => {
      player.currentBet = 0;
    });
    this.currentBet = 0;
    
    switch (this.bettingRound) {
      case 'preflop':
        this.dealCommunityCards(3); // Flop
        this.bettingRound = 'flop';
        break;
      case 'flop':
        this.dealCommunityCards(1); // Turn
        this.bettingRound = 'turn';
        break;
      case 'turn':
        this.dealCommunityCards(1); // River
        this.bettingRound = 'river';
        break;
      case 'river':
        this.gameState = 'showdown';
        this.showdown();
        return;
    }
    
    this.currentPlayerIndex = (this.dealerIndex + 1) % this.players.length;
    while (this.players[this.currentPlayerIndex].folded) {
      this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
    }
  }
  
  showdown() {
    // Simplified showdown - in a real implementation, you'd need proper hand evaluation
    const activePlayers = this.players.filter(p => !p.folded);
    
    if (activePlayers.length === 1) {
      // Only one player left, they win
      activePlayers[0].chips += this.pot;
    } else {
      // For now, split pot equally among remaining players
      // In a real game, you'd evaluate hands and award accordingly
      const winnings = Math.floor(this.pot / activePlayers.length);
      activePlayers.forEach(player => {
        player.chips += winnings;
      });
    }
    
    this.gameState = 'finished';
    
    // Move dealer button
    this.dealerIndex = (this.dealerIndex + 1) % this.players.length;
    
    console.log("Game finished");
    // Reset for next hand
    setTimeout(() => {
      if (this.players.filter(p => p.chips > 0).length >= 2) {
        this.startGame();
        console.log("setTimeout", this.id, this.getGameState());
        if (!this.io) return; // @todo: handle this...
        this.io.to(this.id).emit('game-update', this.getGameState());
      } else {
        this.gameState = 'waiting';
      }
    }, 5000);
  }
  
  getGameState() {
    return {
      id: this.id,
      players: this.players.map(p => ({
        id: p.id,
        name: p.name,
        chips: p.chips,
        currentBet: p.currentBet,
        folded: p.folded,
        hand: p.hand.map(card => card.toString())
      })),
      communityCards: this.communityCards.map(card => card.toString()),
      pot: this.pot,
      currentBet: this.currentBet,
      currentPlayerIndex: this.currentPlayerIndex,
      gameState: this.gameState,
      bettingRound: this.bettingRound
    };
  }
}
