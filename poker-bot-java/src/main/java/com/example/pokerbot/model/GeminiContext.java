package com.example.pokerbot.model;

import java.util.List;

public class GeminiContext {
    public List<Card> playerHand;
    public List<Card> communityCards;
    public List<PlayerInfo> activePlayers;
    public int pot;
    public int amountToCall;
    public int minimumRaiseAmount;
    public String bettingRound;

    public static class PlayerInfo {
        public String name;
        public int chips;
        public int currentBet;
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
