import type React from "react";
import { useState } from "react";

interface JoinFormProps {
	onJoin: (name: string, gameId: string) => void;
	onStart: (gameId: string) => void;
	onJoinAsViewer: (name: string, gameId: string) => void;
}

const JoinForm: React.FC<JoinFormProps> = ({
	onJoin,
	onStart,
	onJoinAsViewer,
}) => {
	const [playerName, setPlayerName] = useState("");
	const [gameId, setGameId] = useState("default");

	const handleJoin = () => {
		onJoin(playerName, gameId);
	};

	const handleStart = () => {
		onStart(gameId);
	};

	const handleJoinAsViewer = () => {
		onJoinAsViewer(playerName, gameId);
	};

	return (
		<div className="join-form">
			<input
				type="text"
				placeholder="Enter your name"
				value={playerName}
				onChange={(e) => setPlayerName(e.target.value)}
			/>
			<input
				type="text"
				placeholder="Game ID (optional)"
				value={gameId}
				onChange={(e) => setGameId(e.target.value)}
			/>
			<div
				style={{
					display: "flex",
					gap: "10px",
					justifyContent: "center",
					marginTop: "10px",
				}}
			>
				<button type="button" onClick={handleJoin}>
					Join as Player
				</button>
				<button type="button" onClick={handleJoinAsViewer}>Join as Viewer</button>
				<button type="button" onClick={handleStart}>Start Game</button>
			</div>
			<p style={{ marginTop: "10px", fontSize: "14px", opacity: 0.8 }}>
				Join as a player to participate, or as a viewer to watch the game.
			</p>
		</div>
	);
};

export default JoinForm;
