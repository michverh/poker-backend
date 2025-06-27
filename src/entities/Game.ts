import type { Server } from "socket.io";
import type { TBettingRound, TGameState } from "@/types";
import { config } from "../config/app-config";
import { type Card, Deck, type Player } from "./index";

const { MAX_PLAYERS } = config;

export class Game {
	id: string;
	maxPlayers: number;
	players: Player[];
	deck: Deck;
	communityCards: Card[];
	pot: number;
	currentBet: number;
	currentPlayerIndex: number;
	dealerIndex: number;
	smallBlind: number;
	bigBlind: number;
	gameState: TGameState;
	bettingRound: TBettingRound;
	io: Server | undefined;
	currentTimeoutId?: NodeJS.Timeout;
	bigBlindHasActed: boolean;
	roundComplete: boolean;
	bettingSequenceStart: number;
	playersActedThisRound: Set<number>;

	constructor(id: string, io: Server, maxPlayers = MAX_PLAYERS) {
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
		this.gameState = "waiting";
		this.bettingRound = "preflop";
		this.io = io;
		this.bigBlindHasActed = false;
		this.roundComplete = false;
		this.bettingSequenceStart = 0;
		this.playersActedThisRound = new Set();
	}

	removePlayer(playerId: string) {
		this.players = this.players.filter((p) => p.id !== playerId);
	}

	startGame() {
		console.log("Starting new game");
		this.gameState = "dealing";
		this.pot = 0;
		this.currentBet = this.bigBlind;
		this.communityCards = [];
		this.deck.reset();
		this.bigBlindHasActed = false;
		this.roundComplete = false;
		this.playersActedThisRound.clear();

		// Reset all players
		this.players.forEach((player) => player.reset());

		// Post blinds
		this.postBlinds();

		// Deal hole cards
		this.dealHoleCards();

		this.gameState = "betting";
		this.bettingRound = "preflop";

		// Set current player to first active player after big blind
		const numPlayers = this.players.length;
		let idx = (this.dealerIndex + 3) % numPlayers;
		for (let i = 0; i < numPlayers; i++) {
			if (!this.players[idx].folded) {
				this.currentPlayerIndex = idx;
				break;
			}
			idx = (idx + 1) % numPlayers;
		}
		// Set the betting sequence start to the first player to act
		this.bettingSequenceStart = this.currentPlayerIndex;

		// Log player order and roles
		console.log("Player order:");
		this.players.forEach((p, i) => {
			let role = "";
			if (i === this.dealerIndex) role = " (Dealer)";
			if (i === (this.dealerIndex + 1) % numPlayers) role += " (SB)";
			if (i === (this.dealerIndex + 2) % numPlayers) role += " (BB)";
			console.log(`[${i}] ${p.name}${role}`);
		});
		console.log("First to act:", this.players[this.currentPlayerIndex].name, "at index", this.currentPlayerIndex);

		console.log(
			"Game started with current player index:",
			this.currentPlayerIndex,
		);
		return true;
	}

	postBlinds() {
		const smallBlindPlayer =
			this.players[(this.dealerIndex + 1) % this.players.length];
		const bigBlindPlayer =
			this.players[(this.dealerIndex + 2) % this.players.length];

		// Check if players have enough chips
		if (smallBlindPlayer.chips < this.smallBlind) {
			throw new Error("Small blind player doesn't have enough chips");
		}
		if (bigBlindPlayer.chips < this.bigBlind) {
			throw new Error("Big blind player doesn't have enough chips");
		}

		// Set all players' currentBet to 0 first
		this.players.forEach((p) => { p.currentBet = 0; });

		this.playerBet(smallBlindPlayer, this.smallBlind);
		this.playerBet(bigBlindPlayer, this.bigBlind);

		// Set pot as sum of all currentBets
		this.pot = this.players.reduce((sum, p) => sum + p.currentBet, 0);
	}

	playerBet(player: Player, amount: number) {
		player.currentBet = amount;
		player.totalBet = amount;
		player.chips -= amount;
	}

	dealToPlayer(player: Player) {
		if (!player) return;
		for (let i = 0; i < 2; i++) {
			player.hand.push(this.deck.deal());
		}
	}

	dealCommunityCards(count: number) {
		console.log("Dealing", count, "community cards");
		for (let i = 0; i < count; i++) {
			const card = this.deck.deal();
			this.communityCards.push(card);
			console.log("Dealt community card:", card.toString());
		}
	}

	playerAction(playerId: string, action: string, amount: number = 0) {
		const player = this.players.find((p) => p.id === playerId);
		console.log("[PlayerAction]", playerId, action, amount, player);
		if (
			!player ||
			player.folded ||
			this.players[this.currentPlayerIndex].id !== playerId
		) {
			console.log(
				`[PlayerAction] Invalid action: not your turn or player folded. CurrentPlayerIndex: ${this.currentPlayerIndex}, Player: ${player && player.name}`,
			);
			return [false, "not your turn?", player];
		}

		// Check if this is the big blind's action
		const bigBlindIndex = (this.dealerIndex + 2) % this.players.length;
		if (this.currentPlayerIndex === bigBlindIndex) {
			this.bigBlindHasActed = true;
			console.log("Big blind has acted");
		}

		// Validate minimum raise
		const minRaise = this.currentBet + this.bigBlind; // Minimum raise is current bet + big blind
		if (action === "raise" && amount < this.bigBlind) {
			console.log(
				"Invalid raise amount:",
				amount,
				"minimum raise:",
				this.bigBlind,
			);
			return [
				false,
				`Invalid raise amount: ${amount}, the minimum raise: ${this.bigBlind}`,
			];
		}

		// Validate player has enough chips
		if (
			action === "call" &&
			player.chips < this.currentBet - player.currentBet
		) {
			console.log("Not enough chips to call");
			return [false, "Not enough chips to call"];
		}
		if (action === "raise" && player.chips < amount) {
			console.log("Not enough chips to raise");
			return [false, "Not enough chips to raise"];
		}

		switch (action) {
			case "fold":
				player.folded = true;
				console.log(
					`Player ${player.name} folded. [Index: ${this.players.indexOf(player)}]`,
				);
				break;

			case "call": {
				const callAmount = Math.min(
					this.currentBet - player.currentBet,
					player.chips,
				);
				player.chips -= callAmount;
				player.currentBet += callAmount;
				player.totalBet += callAmount;
				this.pot += callAmount;
				console.log(
					`Player ${player.name} called: ${callAmount}, new pot: ${this.pot}`,
				);
				break;
			}

			case "raise": {
				const raiseAmount = Math.min(amount, player.chips);
				const totalRaiseAmount =
					raiseAmount + (this.currentBet - player.currentBet);
				player.chips -= totalRaiseAmount;
				player.currentBet = this.currentBet + raiseAmount;
				player.totalBet += totalRaiseAmount;
				this.pot += totalRaiseAmount;
				this.currentBet = player.currentBet;
				this.roundComplete = false;
				this.bettingSequenceStart = this.currentPlayerIndex;
				console.log(
					`Player ${player.name} raised: ${raiseAmount}, total bet: ${this.currentBet}, new pot: ${this.pot}`,
				);
				break;
			}

			case "check":
				if (player.currentBet !== this.currentBet) {
					console.log("Cannot check - must call or fold");
					return [false, "Cannot check - must call or fold"];
				}
				console.log(`Player ${player.name} checked.`);
				break;
		}

		// Log player states after action
		console.log("[Player States After Action]");
		this.players.forEach((p, idx) => {
			console.log(
				`  [${idx}] ${p.name} | Chips: ${p.chips} | Bet: ${p.currentBet} | Folded: ${p.folded}`,
			);
		});
		console.log(
			`Current pot: ${this.pot}, Current bet: ${this.currentBet}, CurrentPlayerIndex: ${this.currentPlayerIndex}`,
		);

		// Track that this player has acted this round
		const playerIdx = this.players.indexOf(player);
		this.playersActedThisRound.add(playerIdx);

		// Add 2-second delay after player action
		setTimeout(() => {
			this.nextPlayer();
		}, 2000);

		return [true, ""];
	}

	nextPlayer() {
		console.log("[nextPlayer] Current index:", this.currentPlayerIndex);
		const numPlayers = this.players.length;
		let nextIdx = (this.currentPlayerIndex + 1) % numPlayers;
		let attempts = 0;
		while (this.players[nextIdx].folded && attempts < numPlayers) {
			nextIdx = (nextIdx + 1) % numPlayers;
			attempts++;
		}
		this.currentPlayerIndex = nextIdx;

		console.log(
			`[nextPlayer] Next player index: ${this.currentPlayerIndex} (${this.players[this.currentPlayerIndex].name}), Folded: ${this.players[this.currentPlayerIndex].folded}`,
		);
		console.log(
			`[nextPlayer] Betting sequence start: ${this.bettingSequenceStart}, Round complete: ${this.roundComplete}`,
		);

		// Check if we've completed a full round (back to betting sequence start)
		if (this.currentPlayerIndex === this.bettingSequenceStart) {
			this.roundComplete = true;
			console.log(
				"Completed full betting round, back to starting position:",
				this.bettingSequenceStart,
			);
		}

		// Check if betting round is complete
		if (this.isBettingRoundComplete()) {
			console.log("Betting round is complete, moving to next round");
			this.nextBettingRound();
		} else {
			// Log whose turn it is next
			console.log(
				`[nextPlayer] Next to act: ${this.players[this.currentPlayerIndex].name} (Index: ${this.currentPlayerIndex})`,
			);
		}
	}

	isBettingRoundComplete() {
		const activePlayers = this.players.filter((p) => !p.folded);
		if (activePlayers.length <= 1) {
			return true;
		}

		const allBetsMatched = activePlayers.every(
			(p) => p.currentBet === this.currentBet || p.chips === 0
		);
		const activeIndices = this.players
			.map((p, idx) => (!p.folded ? idx : -1))
			.filter(idx => idx !== -1);
		const allActed = activeIndices.every(idx => this.playersActedThisRound.has(idx));

		if (this.bettingRound === "preflop") {
			if (this.roundComplete && allBetsMatched && allActed) {
				if (!this.bigBlindHasActed) {
					console.log("Big blind hasn't acted yet");
					return false;
				}
				console.log("Round complete: all players have acted and bets are matched (preflop, big blind has acted)");
				return true;
			}
		} else {
			if (this.roundComplete && allBetsMatched && allActed) {
				console.log("Round complete: all players have acted and bets are matched");
				return true;
			}
		}

		return false;
	}

	nextBettingRound() {
		console.log("[nextBettingRound]", "Current round:", this.bettingRound);

		// Reset current bets for next round
		this.players.forEach((player) => {
			player.currentBet = 0;
		});
		this.currentBet = 0;
		this.roundComplete = false;
		this.playersActedThisRound.clear();

		switch (this.bettingRound) {
			case "preflop":
				console.log("Dealing flop");
				this.dealCommunityCards(3); // Flop
				this.bettingRound = "flop";
				break;
			case "flop":
				console.log("Dealing turn");
				this.dealCommunityCards(1); // Turn
				this.bettingRound = "turn";
				break;
			case "turn":
				console.log("Dealing river");
				this.dealCommunityCards(1); // River
				this.bettingRound = "river";
				break;
			case "river":
				console.log("Moving to showdown");
				this.gameState = "showdown";
				this.showdown();
				return;
		}

		// Set current player to first active player after dealer for new betting round
		// In post-flop rounds, the first player to act is the first active player after the dealer
		console.log("[nextBettingRound] Dealer position:", this.dealerIndex);
		console.log(
			"[nextBettingRound] Player positions: Dealer=",
			this.dealerIndex,
			"SmallBlind=",
			(this.dealerIndex + 1) % this.players.length,
			"BigBlind=",
			(this.dealerIndex + 2) % this.players.length,
		);

		// Start from dealer position and find first active player (including dealer)
		this.currentPlayerIndex = this.dealerIndex;
		while (this.players[this.currentPlayerIndex].folded) {
			this.currentPlayerIndex =
				(this.currentPlayerIndex + 1) % this.players.length;
			console.log(
				"[nextBettingRound] Skipping folded dealer, now at position:",
				this.currentPlayerIndex,
			);
		}

		// Set the betting sequence start to the first player to act
		this.bettingSequenceStart = this.currentPlayerIndex;

		console.log(
			"[nextBettingRound] New round starting with player",
			this.currentPlayerIndex,
			"Round:",
			this.bettingRound,
			"Community cards:",
			this.communityCards.map((card) => card.toString()),
		);
	}

	// Also fix the addPlayer method to not deal cards immediately
	addPlayer(player: Player) {
		if (this.players.length < this.maxPlayers) {
			// Don't deal cards here - only when game starts
			this.players.push(player);
			return true;
		}
		return false;
	}

	// Remove the dealToPlayer method call from addPlayer and fix dealHoleCards
	dealHoleCards() {
		// Reset all player hands first
		this.players.forEach((player) => {
			player.hand = [];
		});

		// Deal 2 cards to each active player
		for (let i = 0; i < 2; i++) {
			this.players.forEach((player) => {
				if (!player.folded) {
					const card = this.deck.deal();
					player.hand.push(card);
				}
			});
		}
	}

	showdown() {
		console.log("\n=== Starting Showdown ===");
		const activePlayers = this.players.filter((p) => !p.folded);
		console.log("Active players:", activePlayers.map((p) => p.name).join(", "));
		console.log(
			"Community cards:",
			this.communityCards.map((card) => card.toString()).join(", "),
		);
		console.log("Pot size:", this.pot);

		if (activePlayers.length === 1) {
			// Only one player left, they win
			activePlayers[0].chips += this.pot;
			console.log(
				`\nSingle player ${activePlayers[0].name} wins ${this.pot} chips`,
			);
		} else {
			// Create side pots for all-in situations
			const sidePots = this.createSidePots(activePlayers);
			console.log("\nSide pots created:", sidePots.length);

			// Evaluate hands and distribute pots
			for (const pot of sidePots) {
				console.log(`\nProcessing pot of ${pot.amount} chips`);
				console.log(
					"Eligible players:",
					pot.players.map((p) => p.name).join(", "),
				);

				const winners = this.evaluateHands(pot.players);

				// Split pot among winners
				const winnings = Math.floor(pot.amount / winners.length);
				winners.forEach((player) => {
					player.chips += winnings;
					console.log(`Player ${player.name} wins ${winnings} chips`);
				});
			}
		}

		this.gameState = "finished";
		console.log("\n=== Showdown Complete ===");

		// Move dealer button to next active player
		do {
			this.dealerIndex = (this.dealerIndex + 1) % this.players.length;
		} while (this.players[this.dealerIndex].chips === 0);
		console.log("New dealer:", this.players[this.dealerIndex].name);

		// Reset for next hand with proper cleanup
		const timeoutId = setTimeout(() => {
			if (this.players.filter((p) => p.chips > 0).length >= 2) {
				this.startGame();
				console.log("Starting new hand");
				if (!this.io) return;
				this.io.to(this.id).emit("game-update", this.getGameState());
			} else {
				this.gameState = "waiting";
				console.log("Not enough players with chips to continue");
			}
		}, 5000);

		// Store timeout ID for cleanup
		this.currentTimeoutId = timeoutId;
	}

	createSidePots(activePlayers: Player[]) {
		const sidePots: { amount: number; players: Player[] }[] = [];
		const sortedPlayers = [...activePlayers].sort(
			(a, b) => a.totalBet - b.totalBet,
		);

		let currentPot = 0;
		let lastBet = 0;

		for (const player of sortedPlayers) {
			if (player.totalBet > lastBet) {
				const betDifference = player.totalBet - lastBet;
				const potContribution = betDifference * sortedPlayers.length;

				sidePots.push({
					amount: potContribution,
					players: sortedPlayers.filter((p) => p.totalBet >= player.totalBet),
				});

				currentPot += potContribution;
				lastBet = player.totalBet;
			}
		}

		return sidePots;
	}

	evaluateHands(players: Player[]): Player[] {
		console.log("\n=== Starting Hand Evaluation ===");
		const playerHands = players.map((player) => {
			const hand = this.evaluatePlayerHand(player);
			console.log(`\nPlayer ${player.name}'s hand:`, {
				cards: [...player.hand, ...this.communityCards].map((card) =>
					card.toString(),
				),
				handDescription: this.getHandDescription(hand),
				strength: hand,
			});
			return { player, hand };
		});

		// Sort by hand strength (highest first)
		playerHands.sort((a, b) => b.hand - a.hand);

		// Get all players with the highest hand
		const highestHand = playerHands[0].hand;
		const winners = playerHands
			.filter((ph) => ph.hand === highestHand)
			.map((ph) => ph.player);

		console.log("\n=== Winners ===");
		winners.forEach((player) => {
			console.log(
				`Player ${player.name} wins with ${this.getHandDescription(highestHand)}`,
			);
		});
		console.log("=== End Hand Evaluation ===\n");

		return winners;
	}

	getHandDescription(handStrength: number): string {
		const baseValue = handStrength % 100;
		const combination = Math.floor(handStrength / 100);

		const descriptions = {
			0: "High Card",
			1: "Pair",
			2: "Two Pair",
			3: "Three of a Kind",
			4: "Straight",
			5: "Flush",
			6: "Full House",
			7: "Four of a Kind",
			8: "Straight Flush",
			9: "Royal Flush",
		};

		return `${descriptions[combination as keyof typeof descriptions]} (${baseValue})`;
	}

	evaluatePlayerHand(player: Player): number {
		const allCards = [...player.hand, ...this.communityCards];

		// Count occurrences of each rank and suit
		const rankCounts = new Map<number, number>();
		const suitCounts = new Map<string, number>();
		allCards.forEach((card) => {
			rankCounts.set(card.value, (rankCounts.get(card.value) || 0) + 1);
			suitCounts.set(card.suit, (suitCounts.get(card.suit) || 0) + 1);
		});

		// Get all unique ranks sorted in descending order
		const uniqueRanks = Array.from(rankCounts.keys()).sort((a, b) => b - a);

		// Check for different hand combinations
		const hasPair = Array.from(rankCounts.values()).some(
			(count) => count === 2,
		);
		const hasTwoPair =
			Array.from(rankCounts.values()).filter((count) => count === 2).length ===
			2;
		const hasThreeOfAKind = Array.from(rankCounts.values()).some(
			(count) => count === 3,
		);
		const hasFourOfAKind = Array.from(rankCounts.values()).some(
			(count) => count === 4,
		);
		const hasFlush = Array.from(suitCounts.values()).some(
			(count) => count >= 5,
		);

		// Check for straight
		let hasStraight = false;
		let straightHighCard = 0;
		if (uniqueRanks.length >= 5) {
			for (let i = 0; i <= uniqueRanks.length - 5; i++) {
				if (uniqueRanks[i] - uniqueRanks[i + 4] === 4) {
					hasStraight = true;
					straightHighCard = uniqueRanks[i];
					break;
				}
			}
			// Check for Ace-low straight (A-5-4-3-2)
			if (!hasStraight && uniqueRanks.includes(14)) {
				// Ace
				const lowStraight = [5, 4, 3, 2];
				if (lowStraight.every((rank) => uniqueRanks.includes(rank))) {
					hasStraight = true;
					straightHighCard = 5;
				}
			}
		}

		// Calculate hand strength
		let handStrength = 0;
		let combination = 0;

		// Check for royal flush
		if (hasStraight && hasFlush && straightHighCard === 14) {
			combination = 9; // Royal Flush
			handStrength = 14;
		}
		// Check for straight flush
		else if (hasStraight && hasFlush) {
			combination = 8; // Straight Flush
			handStrength = straightHighCard;
		}
		// Check for four of a kind
		else if (hasFourOfAKind) {
			combination = 7; // Four of a Kind
			const fourOfAKindRank =
				Array.from(rankCounts.entries()).find(
					([_, count]) => count === 4,
				)?.[0] || 0;
			handStrength = fourOfAKindRank;
		}
		// Check for full house
		else if (hasThreeOfAKind && hasPair) {
			combination = 6; // Full House
			const threeOfAKindRank =
				Array.from(rankCounts.entries()).find(
					([_, count]) => count === 3,
				)?.[0] || 0;
			handStrength = threeOfAKindRank;
		}
		// Check for flush
		else if (hasFlush) {
			combination = 5; // Flush
			const flushSuit =
				Array.from(suitCounts.entries()).find(
					([_, count]) => count >= 5,
				)?.[0] || "";
			const flushCards = allCards
				.filter((card) => card.suit === flushSuit)
				.sort((a, b) => b.value - a.value);
			handStrength = flushCards[0].value;
		}
		// Check for straight
		else if (hasStraight) {
			combination = 4; // Straight
			handStrength = straightHighCard;
		}
		// Check for three of a kind
		else if (hasThreeOfAKind) {
			combination = 3; // Three of a Kind
			const threeOfAKindRank =
				Array.from(rankCounts.entries()).find(
					([_, count]) => count === 3,
				)?.[0] || 0;
			handStrength = threeOfAKindRank;
		}
		// Check for two pair
		else if (hasTwoPair) {
			combination = 2; // Two Pair
			const pairs = Array.from(rankCounts.entries())
				.filter(([_, count]) => count === 2)
				.map(([rank]) => rank)
				.sort((a, b) => b - a);
			handStrength = pairs[0];
		}
		// Check for pair
		else if (hasPair) {
			combination = 1; // Pair
			const pairRank =
				Array.from(rankCounts.entries()).find(
					([_, count]) => count === 2,
				)?.[0] || 0;
			handStrength = pairRank;
		}
		// High card
		else {
			combination = 0; // High Card
			handStrength = Math.max(...allCards.map((card) => card.value));
		}

		return combination * 100 + handStrength;
	}

	// Add cleanup method
	cleanup() {
		if (this.currentTimeoutId) {
			clearTimeout(this.currentTimeoutId);
			this.currentTimeoutId = undefined;
		}
	}

	getGameState(playerId?: string) {
		return {
			id: this.id,
			players: this.players.map((p) => ({
				id: p.id,
				name: p.name,
				chips: p.chips,
				currentBet: p.currentBet,
				folded: p.folded,
				hand: playerId === p.id ? p.hand.map((card) => card.toString()) : [],
			})),
			communityCards: this.communityCards.map((card) => card.toString()),
			pot: this.pot,
			currentBet: this.currentBet,
			currentPlayerIndex: this.currentPlayerIndex,
			gameState: this.gameState,
			bettingRound: this.bettingRound,
			viewerCount: 0, // This will be set by the socket handler
		};
	}

	// Method to get game state with viewer information
	getGameStateWithViewers(viewerCount: number = 0, playerId?: string) {
		const baseState = this.getGameState(playerId);
		return {
			...baseState,
			viewerCount,
		};
	}
}
