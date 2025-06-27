import type React from "react";
import Card from "./Card";

interface YourCardsProps {
	myCards: string[];
}

const YourCards: React.FC<YourCardsProps> = ({ myCards }) => {
	return (
		<div className="your-cards">
			<div>Your Cards:</div>
			<div className="hand-cards">
				{myCards.map((card, index) => (
					<Card key={Math.random() * (index)} card={card} />
				))}
			</div>
		</div>
	);
};

export default YourCards;
