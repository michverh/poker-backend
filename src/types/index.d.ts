type TSuit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
type TRank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';
type TGameState = 'waiting' | 'dealing' | 'betting' | 'showdown' | 'finished';
type TBettingRound = 'preflop' | 'flop' | 'turn' | 'river';


export { TSuit, TRank, TGameState, TBettingRound }