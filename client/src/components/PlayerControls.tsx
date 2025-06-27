import type React from "react";
import { useState } from "react";

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
	currentBet: number;
	currentPlayerIndex: number;
	gameState: string;
}

interface PlayerControlsProps {
	gameState: GameState;
	myPlayerId: string;
	onAction: (action: string, amount?: number) => void;
}

const PlayerControls: React.FC<PlayerControlsProps> = ({
	gameState,
	myPlayerId,
	onAction,
}) => {
	const [raiseAmount, setRaiseAmount] = useState("");

	const myPlayer = gameState.players.find((p) => p.id === myPlayerId);
	const isMyTurn =
		gameState.players[gameState.currentPlayerIndex]?.id === myPlayerId;
	const isBetting = gameState.gameState === "betting";
	const canAct = isMyTurn && isBetting && myPlayer && !myPlayer.folded;

	const handleRaise = () => {
		const amount = parseInt(raiseAmount);
		if (amount > 0) {
			onAction("raise", amount);
			setRaiseAmount("");
			return;
		}
		alert("Wrong amount");
	};

	const getCallAmount = () => {
		if (!myPlayer || gameState.currentBet <= myPlayer.currentBet) return 0;
		return Math.min(gameState.currentBet - myPlayer.currentBet, myPlayer.chips);
	};

	return (
		<div className="controls">
			<button type="button" disabled={!canAct} onClick={() => onAction("fold")}>
				Fold
			</button>

			<button
				type="button"
				disabled={!canAct || myPlayer?.currentBet !== gameState.currentBet}
				onClick={() => onAction("check")}
			>
				Check
			</button>

			<button
				type="button"
				disabled={!canAct || myPlayer?.currentBet === gameState.currentBet}
				onClick={() => onAction("call")}
			>
				{getCallAmount() > 0 ? `Call $${getCallAmount()}` : "Call"}
			</button>

			<input
				type="number"
				className="raise-input"
				placeholder="Amount"
				min="1"
				value={raiseAmount}
				onChange={(e) => setRaiseAmount(e.target.value)}
			/>

			<button type="button" disabled={!canAct} onClick={handleRaise}>
				Raise
			</button>
		</div>
	);
};

export default PlayerControls;
