import type { Card } from "./interfaces";

export class Deck {
	private cards: Card[] = [];
	// Ranks from lowest to highest, including 'T' for Ten
	private ranks = [
		"2",
		"3",
		"4",
		"5",
		"6",
		"7",
		"8",
		"9",
		"T",
		"J",
		"Q",
		"K",
		"A",
	];
	private suits = ["C", "D", "H", "S"];

	constructor() {
		this.reset();
	}

	// Creates a new 52-card deck
	reset(): void {
		this.cards = [];
		for (const suit of this.suits) {
			for (const rank of this.ranks) {
				this.cards.push({ rank, suit });
			}
		}
		this.shuffle();
	}

	// Shuffles the deck using Fisher-Yates algorithm
	shuffle(): void {
		for (let i = this.cards.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
		}
	}

	// Deals a specified number of cards from the top of the deck
	deal(count: number): Card[] {
		if (this.cards.length < count) {
			console.error("Not enough cards left in the deck to deal.");
			// In a real game, you might handle this by reshuffling discards or ending the hand.
			// For now, return an empty array if not enough cards.
			return [];
		}
		return this.cards.splice(0, count);
	}
}
