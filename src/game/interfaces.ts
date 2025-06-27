import type { WebSocket } from "ws";

export interface Card {
	rank: string; // e.g., '2', 'T', 'J', 'Q', 'K', 'A'
	suit: string; // e.g., 'H', 'D', 'C', 'S'
}

// Represents a player in the game
export interface Player {
	id: string;
	name: string;
	socket: WebSocket; // The WebSocket connection for the player (now explicitly from 'ws')
	chips: number;
	hand: Card[]; // Player's private hole cards
	status: "active" | "folded" | "all-in" | "sitting-out" | "spectator";
	currentBet: number; // The amount the player has bet in the current betting round
	hasActed: boolean; // True if player has acted in current betting round and matched highest bet
	isDealer: boolean;
	isSmallBlind: boolean;
	isBigBlind: boolean;
	isSpectator: boolean; // New flag for spectators
}

// Represents a recognized poker hand (e.g., Pair, Flush, Straight)
export interface HandRank {
	type: HandRankType;
	value: number; // Numeric value for comparison (higher is better)
	cards: Card[]; // The actual 5 cards forming this hand
}

// Enum for different types of poker hands
export type HandRankType =
	| "High Card"
	| "Pair"
	| "Two Pair"
	| "Three of a Kind"
	| "Straight"
	| "Flush"
	| "Full House"
	| "Four of a Kind"
	| "Straight Flush"
	| "Royal Flush";

// Server-to-client messages
export interface ServerMessage {
	type: "state" | "player_hand" | "info" | "error";
	payload: GameState | Card[] | string;
}

// Client-to-server messages
export interface ClientMessage {
	type: "join" | "spectate" | "action" | "ready";
	payload: {
		name?: string;
		actionType?: "fold" | "call" | "raise" | "check";
		amount?: number;
	};
}

// Public game state (sent to all clients)
export interface GameState {
	players: Array<{
		id: string;
		name: string;
		chips: number;
		status: "active" | "folded" | "all-in" | "sitting-out" | "spectator";
		currentBet: number;
		isDealer: boolean;
		isSmallBlind: boolean;
		isBigBlind: boolean;
		isSpectator: boolean;
	}>;
	communityCards: Card[];
	pot: number;
	currentBettingRound: "pre-flop" | "flop" | "turn" | "river" | null;
	currentPlayerId: string | null;
	gamePhase:
		| "waiting"
		| "pre-flop"
		| "flop"
		| "turn"
		| "river"
		| "showdown"
		| "hand-over";
	message: string;
	minimumRaiseAmount: number;
	minimumBetForCall: number; // The current highest bet that players must match
}
