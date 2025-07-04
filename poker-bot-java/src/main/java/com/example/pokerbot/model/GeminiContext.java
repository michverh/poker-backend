package com.example.pokerbot.model;

import java.util.List;
import java.util.Objects;
import lombok.ToString;

@ToString
public class GeminiContext {
    public List<Card> playerHand;
    public List<Card> communityCards;
    public List<PlayerInfo> activePlayers;
    public int pot;
    public int amountToCall;
    public int minimumRaiseAmount;
    public String bettingRound;

    @ToString
    public static class PlayerInfo {
        public String name;
        public int chips;
        public int currentBet;

        @Override
        public boolean equals(Object o) {
            if (this == o) return true;
            if (o == null || getClass() != o.getClass()) return false;
            PlayerInfo that = (PlayerInfo) o;
            return chips == that.chips && currentBet == that.currentBet && Objects.equals(name, that.name);
        }

        @Override
        public int hashCode() {
            return Objects.hash(name, chips, currentBet);
        }
    }

    public String getPlayerHandString() {
        if (playerHand == null) return "";
        StringBuilder sb = new StringBuilder();
        for (Card c : playerHand) {
            sb.append(c.rank).append(c.suit).append(" ");
        }
        return sb.toString().trim();
    }

    public String getCommunityCardsString() {
        if (communityCards == null) return "";
        StringBuilder sb = new StringBuilder();
        for (Card c : communityCards) {
            sb.append(c.rank).append(c.suit).append(" ");
        }
        return sb.toString().trim();
    }
}
