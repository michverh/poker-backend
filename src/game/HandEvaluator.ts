import { type Card, type HandRank, HandRankType } from "./interfaces";

export class HandEvaluator {
	// Maps card ranks to their numeric values for comparison
	private static rankValues: { [key: string]: number } = {
		"2": 2,
		"3": 3,
		"4": 4,
		"5": 5,
		"6": 6,
		"7": 7,
		"8": 8,
		"9": 9,
		T: 10,
		J: 11,
		Q: 12,
		K: 13,
		A: 14,
	};

	// Reverse map from numeric values to ranks (for reconstructing cards in straights/flushes)
	private static valueToRank: { [key: number]: string } = {
		2: "2",
		3: "3",
		4: "4",
		5: "5",
		6: "6",
		7: "7",
		8: "8",
		9: "9",
		10: "T",
		11: "J",
		12: "Q",
		13: "K",
		14: "A",
	};

	// Helper to convert card ranks to numeric values. Made public for external comparison needs.
	public static getNumericRank(card: Card): number {
		return HandEvaluator.rankValues[card.rank];
	}

	// Helper to get the rank string from a numeric value
	public static getRankStringFromValue(value: number): string | undefined {
		return HandEvaluator.valueToRank[value];
	}

	// Helper to sort cards by rank (descending)
	public static sortCards(cards: Card[]): Card[] {
		return [...cards].sort(
			(a, b) =>
				HandEvaluator.getNumericRank(b) - HandEvaluator.getNumericRank(a),
		);
	}

	// Helper to get all 5-card combinations from 7 cards
	private static getAllCombinations(cards: Card[], k: number): Card[][] {
		const result: Card[][] = [];
		const f = (start: number, combo: Card[]) => {
			if (combo.length === k) {
				result.push([...combo]);
				return;
			}
			for (let i = start; i < cards.length; i++) {
				combo.push(cards[i]);
				f(i + 1, combo);
				combo.pop();
			}
		};
		f(0, []);
		return result;
	}

	// --- Hand Detection Methods ---

	private static isStraightFlush(cards: Card[]): HandRank | null {
		// First check for a flush, then if that flush is also a straight
		const suitGroups: { [key: string]: Card[] } = {};
		for (const card of cards) {
			if (!suitGroups[card.suit]) {
				suitGroups[card.suit] = [];
			}
			suitGroups[card.suit].push(card);
		}

		for (const suit in suitGroups) {
			if (suitGroups[suit].length >= 5) {
				// If there's a flush, check if a straight exists within it
				const potentialFlushCards = HandEvaluator.sortCards(suitGroups[suit]);
				const straightResult = HandEvaluator.isStraight(potentialFlushCards, 5); // Use the same straight logic

				if (straightResult) {
					// Ensure the straight cards are all of the same suit as the flush
					const isAllSameSuit = straightResult.cards.every(
						(c) => c.suit === suit,
					);
					if (isAllSameSuit) {
						// Check for Royal Flush (T-J-Q-K-A of the same suit)
						const ranksInStraight = straightResult.cards.map((c) => c.rank);
						if (
							ranksInStraight.includes("T") &&
							ranksInStraight.includes("J") &&
							ranksInStraight.includes("Q") &&
							ranksInStraight.includes("K") &&
							ranksInStraight.includes("A")
						) {
							return {
								type: "Royal Flush",
								value:
									900 + HandEvaluator.getNumericRank(straightResult.cards[0]),
								cards: straightResult.cards,
							};
						}
						return {
							type: "Straight Flush",
							value:
								800 + HandEvaluator.getNumericRank(straightResult.cards[0]),
							cards: straightResult.cards,
						};
					}
				}
			}
		}
		return null;
	}

	private static getRankCounts(cards: Card[]): Map<string, number> {
		const counts = new Map<string, number>();
		for (const card of cards) {
			counts.set(card.rank, (counts.get(card.rank) || 0) + 1);
		}
		return counts;
	}

	private static isFourOfAKind(cards: Card[]): HandRank | null {
		const counts = HandEvaluator.getRankCounts(cards);
		for (const [rank, count] of counts) {
			if (count === 4) {
				const quadCards = cards.filter((c) => c.rank === rank);
				const remainingCards = cards.filter((c) => c.rank !== rank);
				const kicker = HandEvaluator.sortCards(remainingCards)[0]; // Best single kicker
				const handCards = [...quadCards, kicker].filter(Boolean).slice(0, 5); // Ensure 5 cards, filter out undefined if no kicker
				return {
					type: "Four of a Kind",
					value: 700 + HandEvaluator.getNumericRank({ rank, suit: "" }),
					cards: handCards,
				};
			}
		}
		return null;
	}

	private static isFullHouse(cards: Card[]): HandRank | null {
		const counts = HandEvaluator.getRankCounts(cards);
		let threeOfAKindRank: string | null = null;
		let pairRank: string | null = null;

		// Find the best 3 of a kind
		const ranksByCount = Array.from(counts.entries())
			.filter(([, count]) => count >= 2) // Filter for at least pairs
			.sort((a, b) => {
				if (b[1] !== a[1]) return b[1] - a[1]; // Prioritize higher counts
				return (
					HandEvaluator.getNumericRank({ rank: b[0], suit: "" }) -
					HandEvaluator.getNumericRank({ rank: a[0], suit: "" })
				); // Then higher ranks
			});

		for (const [rank, count] of ranksByCount) {
			if (count >= 3 && threeOfAKindRank === null) {
				threeOfAKindRank = rank;
			}
		}

		if (threeOfAKindRank) {
			for (const [rank, count] of ranksByCount) {
				if (count >= 2 && rank !== threeOfAKindRank) {
					// Found a pair that is not part of the trips
					if (
						pairRank === null ||
						HandEvaluator.getNumericRank({ rank, suit: "" }) >
							HandEvaluator.getNumericRank({ rank: pairRank, suit: "" })
					) {
						pairRank = rank;
					}
				} else if (
					count >= 3 &&
					rank === threeOfAKindRank &&
					ranksByCount.filter(([r, c]) => c >= 3 && r !== threeOfAKindRank)
						.length > 0
				) {
					// Special case: two sets of 3, use the lower trips as a pair
					const otherTripsRank = ranksByCount.find(
						([r, c]) => c >= 3 && r !== threeOfAKindRank,
					)?.[0];
					if (otherTripsRank) {
						if (
							pairRank === null ||
							HandEvaluator.getNumericRank({ rank: otherTripsRank, suit: "" }) >
								HandEvaluator.getNumericRank({ rank: pairRank, suit: "" })
						) {
							pairRank = otherTripsRank;
						}
					}
				}
			}
		}

		if (threeOfAKindRank && pairRank) {
			const threeCards = cards
				.filter((c) => c.rank === threeOfAKindRank)
				.slice(0, 3);
			const pairCards = cards.filter((c) => c.rank === pairRank).slice(0, 2);
			const handCards = [...threeCards, ...pairCards];
			return {
				type: "Full House",
				value:
					600 +
					HandEvaluator.getNumericRank({ rank: threeOfAKindRank, suit: "" }) *
						100 +
					HandEvaluator.getNumericRank({ rank: pairRank, suit: "" }),
				cards: handCards,
			};
		}
		return null;
	}

	private static isFlush(cards: Card[]): HandRank | null {
		const suitGroups: { [key: string]: Card[] } = {};
		for (const card of cards) {
			if (!suitGroups[card.suit]) {
				suitGroups[card.suit] = [];
			}
			suitGroups[card.suit].push(card);
		}

		for (const suit in suitGroups) {
			if (suitGroups[suit].length >= 5) {
				const flushCards = HandEvaluator.sortCards(suitGroups[suit]).slice(
					0,
					5,
				);
				return {
					type: "Flush",
					value: 500 + HandEvaluator.getNumericRank(flushCards[0]),
					cards: flushCards,
				};
			}
		}
		return null;
	}

	private static isStraight(
		cards: Card[],
		minLength: number = 5,
	): HandRank | null {
		const uniqueNumericRanks = Array.from(
			new Set(cards.map((c) => HandEvaluator.getNumericRank(c))),
		).sort((a, b) => a - b);

		// Handle Ace low straight (A,2,3,4,5)
		// Ace is 14, but for this straight, it acts as 1.
		if (
			uniqueNumericRanks.includes(14) &&
			uniqueNumericRanks.includes(2) &&
			uniqueNumericRanks.includes(3) &&
			uniqueNumericRanks.includes(4) &&
			uniqueNumericRanks.includes(5)
		) {
			// This is a 5-high straight
			const straightCardsRanks = ["A", "5", "4", "3", "2"]; // Order for value and display
			const straightCards = HandEvaluator.sortCards(
				cards.filter((c) => straightCardsRanks.includes(c.rank)),
			).slice(0, 5);
			return {
				type: "Straight",
				value: 400 + HandEvaluator.getNumericRank({ rank: "5", suit: "" }),
				cards: straightCards,
			};
		}

		let bestStraight: Card[] | null = null;
		let bestStraightHighValue = -1;

		for (let i = 0; i <= uniqueNumericRanks.length - minLength; i++) {
			let isCurrentStraight = true;
			const currentStraightCards: Card[] = [];

			for (let j = 0; j < minLength; j++) {
				if (uniqueNumericRanks[i + j] !== uniqueNumericRanks[i] + j) {
					isCurrentStraight = false;
					break;
				}
				// Add cards to currentStraightCards to track
				const rankString = HandEvaluator.getRankStringFromValue(
					uniqueNumericRanks[i] + j,
				);
				if (rankString) {
					// Find *any* card with this rank. We will sort later.
					const cardWithThisRank = cards.find((c) => c.rank === rankString);
					if (cardWithThisRank) {
						currentStraightCards.push(cardWithThisRank);
					}
				}
			}

			if (isCurrentStraight && currentStraightCards.length === minLength) {
				const straightHighRankValue = uniqueNumericRanks[i + minLength - 1];
				if (straightHighRankValue > bestStraightHighValue) {
					bestStraightHighValue = straightHighRankValue;
					bestStraight = HandEvaluator.sortCards(currentStraightCards);
				}
			}
		}

		if (bestStraight) {
			return {
				type: "Straight",
				value: 400 + bestStraightHighValue,
				cards: bestStraight,
			};
		}

		return null;
	}

	private static isThreeOfAKind(cards: Card[]): HandRank | null {
		const counts = HandEvaluator.getRankCounts(cards);
		for (const [rank, count] of counts) {
			if (count === 3) {
				const tripCards = cards.filter((c) => c.rank === rank);
				const remainingCards = cards.filter((c) => c.rank !== rank);
				const kickers = HandEvaluator.sortCards(remainingCards).slice(0, 2);
				const handCards = [...tripCards, ...kickers]
					.filter(Boolean)
					.slice(0, 5);
				return {
					type: "Three of a Kind",
					value: 300 + HandEvaluator.getNumericRank({ rank, suit: "" }),
					cards: handCards,
				};
			}
		}
		return null;
	}

	private static isTwoPair(cards: Card[]): HandRank | null {
		const counts = HandEvaluator.getRankCounts(cards);
		const pairs: string[] = [];
		for (const [rank, count] of counts) {
			if (count >= 2) {
				pairs.push(rank);
			}
		}

		if (pairs.length >= 2) {
			// Sort pairs by rank descending to get the two highest pairs
			pairs.sort(
				(a, b) =>
					HandEvaluator.getNumericRank({ rank: b, suit: "" }) -
					HandEvaluator.getNumericRank({ rank: a, suit: "" }),
			);
			const bestPair1Rank = pairs[0];
			const bestPair2Rank = pairs[1];

			const pair1Cards = cards
				.filter((c) => c.rank === bestPair1Rank)
				.slice(0, 2);
			const pair2Cards = cards
				.filter((c) => c.rank === bestPair2Rank)
				.slice(0, 2);

			const remainingCards = cards.filter(
				(c) => c.rank !== bestPair1Rank && c.rank !== bestPair2Rank,
			);
			const kicker = HandEvaluator.sortCards(remainingCards)[0]; // Best single kicker
			const handCards = [...pair1Cards, ...pair2Cards, kicker]
				.filter(Boolean)
				.slice(0, 5);

			return {
				type: "Two Pair",
				value:
					200 +
					HandEvaluator.getNumericRank({ rank: bestPair1Rank, suit: "" }) *
						100 +
					HandEvaluator.getNumericRank({ rank: bestPair2Rank, suit: "" }),
				cards: handCards,
			};
		}
		return null;
	}

	private static isPair(cards: Card[]): HandRank | null {
		const counts = HandEvaluator.getRankCounts(cards);
		let pairRank: string | null = null;
		for (const [rank, count] of counts) {
			if (count >= 2) {
				// If multiple pairs, take the highest one
				if (
					!pairRank ||
					HandEvaluator.getNumericRank({ rank, suit: "" }) >
						HandEvaluator.getNumericRank({ rank: pairRank, suit: "" })
				) {
					pairRank = rank;
				}
			}
		}

		if (pairRank) {
			const pairCards = cards.filter((c) => c.rank === pairRank).slice(0, 2);
			const remainingCards = cards.filter((c) => c.rank !== pairRank);
			const kickers = HandEvaluator.sortCards(remainingCards).slice(0, 3);
			const handCards = [...pairCards, ...kickers].filter(Boolean).slice(0, 5);
			return {
				type: "Pair",
				value: 100 + HandEvaluator.getNumericRank({ rank: pairRank, suit: "" }),
				cards: handCards,
			};
		}
		return null;
	}

	private static getHighCard(cards: Card[]): HandRank {
		const sorted = HandEvaluator.sortCards(cards);
		const handCards = sorted.slice(0, 5); // Take top 5 cards for high card comparison
		return {
			type: "High Card",
			value: HandEvaluator.getNumericRank(sorted[0]),
			cards: handCards,
		};
	}

	// Main evaluation method: Finds the best 5-card hand from 7 cards
	public static evaluateHand(
		holeCards: Card[],
		communityCards: Card[],
	): HandRank {
		const allCards = [...holeCards, ...communityCards];
		const combinations = HandEvaluator.getAllCombinations(allCards, 5); // Get all 5-card combinations

		let bestHand: HandRank = { type: "High Card", value: 0, cards: [] }; // Initialize with lowest possible hand

		// Evaluate each 5-card combination and find the best one
		for (const combo of combinations) {
			const sortedCombo = HandEvaluator.sortCards(combo); // Sort for consistent evaluation

			// Check hands in descending order of strength
			let currentHand: HandRank | null = null;

			currentHand = HandEvaluator.isStraightFlush(sortedCombo);
			if (currentHand === null)
				currentHand = HandEvaluator.isFourOfAKind(sortedCombo);
			if (currentHand === null)
				currentHand = HandEvaluator.isFullHouse(sortedCombo);
			if (currentHand === null)
				currentHand = HandEvaluator.isFlush(sortedCombo);
			if (currentHand === null)
				currentHand = HandEvaluator.isStraight(sortedCombo);
			if (currentHand === null)
				currentHand = HandEvaluator.isThreeOfAKind(sortedCombo);
			if (currentHand === null)
				currentHand = HandEvaluator.isTwoPair(sortedCombo);
			if (currentHand === null) currentHand = HandEvaluator.isPair(sortedCombo);
			if (currentHand === null)
				currentHand = HandEvaluator.getHighCard(sortedCombo); // Always a high card hand

			// Compare with current best hand using a dedicated comparison method
			if (HandEvaluator.compareHands(currentHand, bestHand) > 0) {
				bestHand = currentHand;
			}
		}
		return bestHand;
	}

	/**
	 * Compares two poker hands to determine which is better.
	 * Returns a positive number if handA is better than handB,
	 * a negative number if handB is better than handA,
	 * and 0 if they are tied.
	 * This method assumes both HandRank objects have 'cards' populated with the best 5-card combination.
	 */
	public static compareHands(handA: HandRank, handB: HandRank): number {
		// Primary comparison: hand type value
		if (handA.value !== handB.value) {
			return handA.value - handB.value;
		}

		// Secondary comparison: Kicker cards for tie-breaking
		// Iterate through the 5 cards of the hand, from highest to lowest rank
		for (let i = 0; i < 5; i++) {
			// Ensure cards exist for comparison (should always for a valid 5-card hand)
			if (handA.cards[i] && handB.cards[i]) {
				const rankA = HandEvaluator.getNumericRank(handA.cards[i]);
				const rankB = HandEvaluator.getNumericRank(handB.cards[i]);
				if (rankA !== rankB) {
					return rankA - rankB;
				}
			}
		}

		return 0; // Hands are completely tied
	}
}
