import type { TSuit, TRank } from "@/types"

export const config = {
    suits: ['hearts', 'diamonds', 'clubs', 'spades'] as TSuit[],
    ranks: ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'] as TRank[],
    MAX_PLAYERS: 8,
}
