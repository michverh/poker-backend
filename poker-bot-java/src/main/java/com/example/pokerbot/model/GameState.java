package com.example.pokerbot.model;

import java.util.List;

import lombok.ToString;

@ToString
public class GameState {
    public List<Player> players;
    public List<Card> communityCards;
    public int pot;
    public String currentBettingRound;
    public String currentPlayerId;
    public String gamePhase;
    public String message;
    public int minimumRaiseAmount;
    public int minimumBetForCall;

    @ToString
    public static class Player {
        public String id;
        public String name;
        public int chips;
        public String status;
        public int currentBet;
        public boolean isDealer;
        public boolean isSmallBlind;
        public boolean isBigBlind;
        public boolean isSpectator;
    }
}

