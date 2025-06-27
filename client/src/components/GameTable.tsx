import type React from "react";
import * as uuid from "uuid";
import Card from "./Card";

interface Player {
	id: string;
	name: string;
	chips: number;
	currentBet: number;
	folded: boolean;
	hand: string[];
}

interface GameState {
	players: Player[];
	communityCards: string[];
	currentPlayerIndex: number;
	gameState: string;
}

interface GameTableProps {
	gameState: GameState;
	myPlayerId: string;
	myCards?: string[];
}

const GameTable: React.FC<GameTableProps> = ({
	gameState,
	myPlayerId,
	myCards = [],
}) => {
	console.log("GameTable render:", {
		myPlayerId,
		players: gameState.players.map((p) => ({
			id: p.id,
			name: p.name,
			handLength: p.hand.length,
		})),
	});

	return (
		<div className="poker-table">
			<div className="community-cards">
				{gameState.communityCards.map((card) => (
					<Card key={uuid.v1()} card={card} />
				))}
			</div>
			<div className="player-positions">
				{gameState.players.map((player, index) => (
					<div
						key={player.id}
						className={`player ${index === gameState.currentPlayerIndex && gameState.gameState === "betting" ? "current" : ""} ${player.folded ? "folded" : ""}`}
					>
						<div className="player-name">{player.name}</div>
						<div className="player-chips">${player.chips}</div>
						<div className="player-chips">Bet: ${player.currentBet}</div>
						<div className="player-cards">
							{player.id === myPlayerId ? (
								myCards.map((card) => (
									<Card key={uuid.v1()} card={card} />
								))
							) : (
								<>
									<Card card="??" />
									<Card card="??" />
								</>
							)}
						</div>
						<div style={{ fontSize: "10px", opacity: 0.7 }}>
							ID: {player.id.substring(0, 8)}...
						</div>
					</div>
				))}
			</div>
		</div>
	);
};

export default GameTable;
