package com.example.pokerbot;

import lombok.extern.slf4j.Slf4j;
import okhttp3.*;
import org.springframework.stereotype.Service;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import com.example.pokerbot.model.Card;
import com.example.pokerbot.model.GameState;
import com.example.pokerbot.model.GeminiContext;
import com.example.pokerbot.model.GeminiAction;

import java.util.stream.Collectors;
import java.util.Arrays;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;

@Slf4j
@Service
public class PokerWebSocketClient {
    private final OkHttpClient client = new OkHttpClient.Builder()
            .readTimeout(0, TimeUnit.MILLISECONDS)
            .build();
    private final String wsUrl = "ws://192.168.1.92:8080";
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final AtomicReference<String> playerId = new AtomicReference<>(null);

    @Autowired
    private GeminiAiService geminiAiService;

// Add this field to prevent duplicate actions
private final AtomicReference<String> lastProcessedState = new AtomicReference<>();

    public void connect() {
        Request request = new Request.Builder().url(wsUrl).build();
        client.newWebSocket(request, new WebSocketListener() {
            @Override
            public void onOpen(WebSocket webSocket, Response response) {
                // Send join message
                String joinMsg = "{\"type\":\"join\",\"payload\":{\"name\":\"Team Redbull\"}}";
                webSocket.send(joinMsg);
            }
            @Override
            public void onMessage(WebSocket webSocket, String text) {
                try {
                    JsonNode root = objectMapper.readTree(text);
                    String type = root.path("type").asText();
                    JsonNode payload = root.path("payload");

                    switch (type) {
                        case "state":
                            GameState gameState = objectMapper.treeToValue(payload, GameState.class);
                            log.info("Game state is {}", gameState);
                            handleGameState(webSocket, gameState);
                            break;
                        case "player_hand":
                            Card[] hand = objectMapper.treeToValue(payload, Card[].class);
                            log.info("Received player hand: {}", Arrays.toString(hand));
                            handlePlayerHand(hand);
                            break;
                        case "info":
                            // Optionally handle info
                            log.info("Game info: {}", payload);
                            break;
                        case "error":
                            // Optionally handle error
                            log.info("Game error: {}", payload);
                            break;
                            // Unknown message type
                    }
                } catch (Exception e) {
                    e.printStackTrace();
                }
            }
            @Override
            public void onFailure(WebSocket webSocket, Throwable t, Response response) {
                t.printStackTrace();
            }
        });
    }

    private Card[] currentHand = null;
    private GameState latestGameState = null;

private final AtomicReference<String> lastActedRound = new AtomicReference<>();
private final AtomicInteger lastActedAtBetLevel = new AtomicInteger(0);
private final AtomicBoolean hasActedThisRound = new AtomicBoolean(false);
private final AtomicLong lastActionTime = new AtomicLong(0);
private final AtomicReference<String> lastGameStateHash = new AtomicReference<>();

private void handlePlayerHand(Card[] hand) {
    this.currentHand = hand;
    // Reset action tracking for new hand
    hasActedThisRound.set(false);
    lastActedRound.set(null);
    lastActedAtBetLevel.set(0);
    lastActionTime.set(0);
    lastGameStateHash.set(null);
    log.info("New hand started - reset action tracking flags");
}

private void handleGameState(WebSocket webSocket, GameState gameState) {
    this.latestGameState = gameState;

    // Create a hash of the current game state to detect duplicates
    String gameStateHash = createGameStateHash(gameState);
    if (gameStateHash.equals(lastGameStateHash.get())) {
        log.debug("Duplicate game state received, ignoring");
        return;
    }

    // Find our playerId if not set
    if (playerId.get() == null) {
        gameState.players.stream()
            .filter(p -> "Team Redbull".equals(p.name))
            .findFirst()
            .ifPresent(p -> playerId.set(p.id));
    }

    String myId = playerId.get();
    if (myId == null) {
        return; // Can't act without knowing our ID
    }

    // Check if it's our turn
    if (!myId.equals(gameState.currentPlayerId)) {
        // Update the hash even if it's not our turn to track state changes
        lastGameStateHash.set(gameStateHash);
        return; // Not our turn
    }

    // Find ourselves in the game state
    GameState.Player me = gameState.players.stream()
        .filter(p -> myId.equals(p.id))
        .findFirst().orElse(null);

    if (me == null || !"active".equals(me.status) || currentHand == null) {
        lastGameStateHash.set(gameStateHash);
        return; // Can't act if we're not active or don't have cards
    }

    // Prevent acting too quickly after our last action (avoid acting on immediate state updates)
    long currentTime = System.currentTimeMillis();
    if (currentTime - lastActionTime.get() < 2000) { // Increased to 2 seconds
        log.debug("Too soon after last action ({} ms), skipping to avoid acting on stale state",
                  currentTime - lastActionTime.get());
        return;
    }

    // Create identifier for this betting round
    String currentRound = String.format("%s_%s_%d_%s",
        gameState.gamePhase,
        gameState.currentBettingRound != null ? gameState.currentBettingRound : "null",
        gameState.pot,
        gameState.message); // Include pot to detect when betting action has occurred

    // Check if we're in a new betting round
    boolean isNewRound = !currentRound.equals(lastActedRound.get());

    // Check if the bet level has increased since our last action
    boolean betLevelIncreased = gameState.minimumBetForCall > lastActedAtBetLevel.get();

    if (isNewRound) {
        // New betting round - reset everything
        hasActedThisRound.set(false);
        lastActedRound.set(currentRound);
        lastActedAtBetLevel.set(0);
        log.debug("New betting round detected: {}, resetting action flags", currentRound);
    } else if (betLevelIncreased) {
        // Same round but bet level increased (someone raised) - allow us to act again
        hasActedThisRound.set(false);
        log.debug("Bet level increased from {} to {} in round {}, allowing new action",
                  lastActedAtBetLevel.get(), gameState.minimumBetForCall, currentRound);
    }

    // Check if we've already acted at this bet level in this round
    if (hasActedThisRound.get()) {
        log.debug("Already acted in round {} at bet level {}, skipping action",
                  currentRound, gameState.minimumBetForCall);
        lastGameStateHash.set(gameStateHash);
        return;
    }

    // Mark that we're about to act to prevent race conditions
    if (!hasActedThisRound.compareAndSet(false, true)) {
        log.debug("Another thread is already processing action for this round");
        return;
    }

    // Update the game state hash to track this state
    lastGameStateHash.set(gameStateHash);

    log.info("Taking action for game state: phase={}, round={}, pot={}, myBet={}, betLevel={}",
        gameState.gamePhase, gameState.currentBettingRound, gameState.pot, me.currentBet, gameState.minimumBetForCall);

    try {
        // Add a small delay to ensure server has fully processed any recent actions
        Thread.sleep(500);

        // Build GeminiContext
        GeminiContext ctx = new GeminiContext();
        ctx.playerHand = Arrays.asList(currentHand);
        ctx.communityCards = gameState.communityCards;
        ctx.activePlayers = gameState.players.stream()
            .filter(p -> "active".equals(p.status) || "all-in".equals(p.status))
            .map(p -> {
                GeminiContext.PlayerInfo pi = new GeminiContext.PlayerInfo();
                pi.name = p.name;
                pi.chips = p.chips;
                pi.currentBet = p.currentBet;
                return pi;
            })
            .collect(Collectors.toList());
        ctx.pot = gameState.pot;
        ctx.amountToCall = gameState.minimumBetForCall;
        ctx.minimumRaiseAmount = gameState.minimumRaiseAmount;
        ctx.bettingRound = gameState.currentBettingRound;

        GeminiAction action = geminiAiService.getBotAction(ctx);
        String actionMsg;
        if ("raise".equals(action.actionType)) {
            int amount = action.amount != null ? action.amount : ctx.minimumRaiseAmount;
            actionMsg = String.format("{\"type\":\"action\",\"payload\":{\"actionType\":\"raise\",\"amount\":%d}}", amount);
        } else {
            actionMsg = String.format("{\"type\":\"action\",\"payload\":{\"actionType\":\"%s\"}}", action.actionType);
        }

        log.info("Sending action: {}", actionMsg);
        webSocket.send(actionMsg);

        // Record the bet level we acted at and the time
        lastActedAtBetLevel.set(gameState.minimumBetForCall);
        lastActionTime.set(currentTime);

    } catch (Exception e) {
        log.error("Error processing bot action", e);
        // Reset the flag on error so we can try again
        hasActedThisRound.set(false);
    }
}

private String createGameStateHash(GameState gameState) {
    // Create a hash based on key game state elements that indicate when action is needed
    return String.format("%s_%s_%s_%d_%d_%s",
        gameState.gamePhase,
        gameState.currentBettingRound,
        gameState.currentPlayerId,
        gameState.pot,
        gameState.minimumBetForCall,
        gameState.message);
}
}